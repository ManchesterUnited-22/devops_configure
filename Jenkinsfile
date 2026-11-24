pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    parameters {
        booleanParam(
            name: 'RUN_AI_REVIEW',
            defaultValue: false,
            description: 'Run optional AI Code Review'
        )
    }

    environment {
        IMAGE_NAME = 'food-our-web'
        CONTAINER_NAME = 'food-our-container'
        HOST_PORT = '8081'

        TEST_PORT = '8082'

        OLLAMA_URL = 'http://127.0.0.1:11434'
        AI_MODEL = 'qwen2.5-coder:3b'

        DEPLOY_STARTED = 'false'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '[GIT] Getting source code...'

                checkout scm

                sh '''
                    rm -f .prev_image
                    mkdir -p reports

                    git log -1 --oneline
                '''
            }
        }

        stage('Preflight Check') {
            steps {
                sh '''
                    echo "[SYSTEM] Checking environment"

                    docker info >/dev/null
                    trivy --version
                    python3 --version
                    curl --version | head -n 1

                    echo "[SYSTEM] Memory"
                    free -h

                    echo "[SYSTEM] Disk"
                    df -h /
                '''
            }
        }

        stage('Setup Python Environment') {
            steps {
                sh '''
                    if [ ! -x .venv/bin/python ]; then
                        python3 -m venv .venv
                    fi

                    if [ ! -f .venv/requirements.snapshot ] || \
                       ! cmp -s requirements.txt \
                       .venv/requirements.snapshot; then

                        .venv/bin/python -m pip install \
                            -r requirements.txt

                        cp requirements.txt \
                            .venv/requirements.snapshot
                    fi

                    echo "[PYTHON] Environment ready"
                '''
            }
        }

        stage('AI Code Review') {
            when {
                expression {
                    return params.RUN_AI_REVIEW
                }
            }

            steps {
                catchError(
                    buildResult: 'SUCCESS',
                    stageResult: 'UNSTABLE'
                ) {
                    timeout(time: 3, unit: 'MINUTES') {
                        sh '''
                            echo "[AI] Reviewing source code"

                            .venv/bin/python \
                                -m ai.code_review \
                                > reports/ai-code-review.txt

                            cat reports/ai-code-review.txt
                        '''
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    echo "[DOCKER] Building image"

                    time docker build \
                        -t "${IMAGE_NAME}:${BUILD_NUMBER}" .

                    docker image inspect \
                        "${IMAGE_NAME}:${BUILD_NUMBER}" \
                        --format='Image ID: {{.Id}}'
                '''
            }
        }

        stage('Security Scan') {
            steps {
                sh '''
                    echo "[SECURITY] Starting Trivy"

                    time bash security/scan.sh \
                        "${IMAGE_NAME}:${BUILD_NUMBER}"
                '''
            }
        }

        stage('Testing Environment') {
            steps {
                sh '''
                    set -eu

                    TEST_CONTAINER="${CONTAINER_NAME}-test-${BUILD_NUMBER}"

                    cleanup() {
                        docker rm -f "$TEST_CONTAINER" \
                            >/dev/null 2>&1 || true
                    }

                    trap cleanup EXIT

                    echo "[TEST] Starting test container"

                    docker run -d \
                        --name "$TEST_CONTAINER" \
                        -p "127.0.0.1:${TEST_PORT}:80" \
                        "${IMAGE_NAME}:${BUILD_NUMBER}"

                    echo "[TEST] Checking HTTP response"

                    curl \
                        --retry 10 \
                        --retry-connrefused \
                        --retry-delay 2 \
                        --max-time 5 \
                        --fail \
                        --silent \
                        --show-error \
                        --output /dev/null \
                        "http://localhost:${TEST_PORT}/"

                    echo "[TEST] Testing passed"
                '''
            }
        }

        stage('Backup Current Deployment') {
            steps {
                sh '''
                    if docker inspect "${CONTAINER_NAME}" \
                        >/dev/null 2>&1; then

                        docker inspect \
                            --format='{{.Image}}' \
                            "${CONTAINER_NAME}" > .prev_image

                        echo "[BACKUP] Previous image:"
                        cat .prev_image
                    else
                        echo "[BACKUP] First deployment"
                    fi
                '''
            }
        }

        stage('Deploy Container') {
            steps {
                script {
                    env.DEPLOY_STARTED = 'true'
                }

                sh '''
                    echo "[DEPLOY] Starting deployment"

                    if docker inspect "${CONTAINER_NAME}" \
                        >/dev/null 2>&1; then

                        docker rm -f "${CONTAINER_NAME}"
                    fi

                    docker run -d \
                        --name "${CONTAINER_NAME}" \
                        --restart unless-stopped \
                        -p "${HOST_PORT}:80" \
                        "${IMAGE_NAME}:${BUILD_NUMBER}"

                    echo "[DEPLOY] Container started"
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "[HEALTHCHECK] Checking website"

                    curl \
                        --retry 10 \
                        --retry-connrefused \
                        --retry-delay 2 \
                        --max-time 5 \
                        --fail \
                        --silent \
                        --show-error \
                        --output /dev/null \
                        "http://localhost:${HOST_PORT}/"

                    echo "[HEALTHCHECK] HTTP check passed"

                    docker ps \
                        --filter "name=${CONTAINER_NAME}"

                    docker inspect \
                        --format='{{.State.Status}}' \
                        "${CONTAINER_NAME}"

                    echo "[HEALTHCHECK] Deployment verified"
                '''
            }
        }

        stage('Update Latest Tag') {
            steps {
                sh '''
                    docker tag \
                        "${IMAGE_NAME}:${BUILD_NUMBER}" \
                        "${IMAGE_NAME}:latest"

                    echo "[DOCKER] Latest tag updated"
                '''
            }
        }

        stage('Cleanup Old Images') {
            steps {
                sh '''
                    echo "[CLEANUP] Keeping 3 newest build tags"

                    docker images "${IMAGE_NAME}" \
                        --format '{{.Tag}}' \
                        | grep -E '^[0-9]+$' \
                        | sort -rn \
                        | tail -n +4 \
                        | xargs -r -I{} \
                            docker rmi "${IMAGE_NAME}:{}" \
                        || true
                '''
            }
        }
    }

    post {

        success {
            echo '[SUCCESS] Deployment completed!'
        }

        failure {

            echo '[ERROR] Pipeline failed'

            script {

                // Capture logs before rollback
                sh '''
                    mkdir -p reports

                    if [ "${DEPLOY_STARTED}" = "true" ]; then
                        docker logs \
                            --tail 100 \
                            "${CONTAINER_NAME}" \
                            > reports/docker-failure.log 2>&1 \
                            || true
                    fi
                '''

                // Rollback only if deployment started
                if (env.DEPLOY_STARTED == 'true') {

                    echo '[ROLLBACK] Restoring previous version'

                    catchError(
                        buildResult: 'FAILURE',
                        stageResult: 'FAILURE'
                    ) {
                        sh '''
                            set -eu

                            if docker inspect "${CONTAINER_NAME}" \
                                >/dev/null 2>&1; then

                                docker rm -f "${CONTAINER_NAME}"
                            fi

                            if [ -s .prev_image ]; then

                                PREV=$(cat .prev_image)

                                docker run -d \
                                    --name "${CONTAINER_NAME}" \
                                    --restart unless-stopped \
                                    -p "${HOST_PORT}:80" \
                                    "$PREV"

                                curl \
                                    --retry 10 \
                                    --retry-connrefused \
                                    --retry-delay 2 \
                                    --max-time 5 \
                                    --fail \
                                    --silent \
                                    --show-error \
                                    --output /dev/null \
                                    "http://localhost:${HOST_PORT}/"

                                docker tag "$PREV" \
                                    "${IMAGE_NAME}:latest"

                                echo "[ROLLBACK] Restored $PREV"

                            else
                                echo "[ROLLBACK] No previous version"
                            fi
                        '''
                    }

                } else {
                    echo '[ROLLBACK] Not required'
                }

                // AI incident analysis
                catchError(
                    buildResult: 'FAILURE',
                    stageResult: 'FAILURE'
                ) {

                    timeout(time: 3, unit: 'MINUTES') {

                        def consoleLog =
                            currentBuild.rawBuild
                                .getLog(150)
                                .join('\n')

                        writeFile(
                            file: 'reports/jenkins-failure.log',
                            text: consoleLog
                        )

                        sh '''
                            echo "[AI] Analyzing pipeline failure"

                            if [ -x .venv/bin/python ]; then

                                {
                                    cat reports/jenkins-failure.log

                                    if [ -f reports/docker-failure.log ]; then
                                        cat reports/docker-failure.log
                                    fi

                                } | .venv/bin/python \
                                    -m ai.log_analyzer \
                                    > reports/ai-incident.txt

                                cat reports/ai-incident.txt

                            else
                                echo "[AI] Python environment unavailable"
                            fi
                        '''
                    }
                }
            }
        }

        cleanup {

            archiveArtifacts(
                artifacts: 'reports/**/*.txt,reports/**/summary.json',
                allowEmptyArchive: true
            )

            sh '''
                rm -f .prev_image
            '''

            echo '[SYSTEM] Pipeline finished'
        }
    }
}