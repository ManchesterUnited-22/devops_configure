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

    choice(
        name: 'FAILURE_TEST',
        choices: [
            'NONE',
            'BEFORE_DEPLOY',
            'AFTER_DEPLOY'
        ],
        description: 'Controlled pipeline failure simulation'
    )
}

    environment {
        IMAGE_NAME = 'food-our-web'
        CONTAINER_NAME = 'food-our-container'
        HOST_PORT = '8081'

        TEST_PORT = '8082'

        OLLAMA_URL = 'http://127.0.0.1:11434'
        AI_MODEL = 'qwen2.5-coder:3b'

       script {
    env.DEPLOY_STARTED = 'false'
}
    }

    stages {

        stage('Checkout') {
            steps {
                echo '[GIT] Getting source code...'

                checkout scm

                sh '''
                    rm -f .prev_image

            mkdir -p reports

        rm -f reports/pipeline-failure.log \
              reports/testing-container.log \
              reports/docker-failure.log \
              reports/ai-incident.txt \
              reports/ai-code-review.txt

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

            mkdir -p reports

            TEST_CONTAINER="${CONTAINER_NAME}-test-${BUILD_NUMBER}"

            cleanup() {
                docker logs "$TEST_CONTAINER" \
                    > reports/testing-container.log 2>&1 || true

                docker rm -f "$TEST_CONTAINER" \
                    >/dev/null 2>&1 || true
            }

            trap cleanup EXIT

            echo "[TEST] Starting test container"

            docker run -d \
                --name "$TEST_CONTAINER" \
                -p "127.0.0.1:${TEST_PORT}:80" \
                "${IMAGE_NAME}:${BUILD_NUMBER}"

            echo "[TEST] Waiting for Nginx..."

            for i in $(seq 1 15); do

                if curl \
                    --connect-timeout 2 \
                    --max-time 5 \
                    --fail \
                    --silent \
                    --show-error \
                    --output /dev/null \
                    "http://127.0.0.1:${TEST_PORT}/"; then

                    echo "[TEST] HTTP check passed"
                    exit 0
                fi

                echo "[TEST] Attempt $i/15 failed"

                sleep 2
            done

            echo "[ERROR] Testing environment failed"

            docker ps -a \
                --filter "name=$TEST_CONTAINER"

            docker logs "$TEST_CONTAINER" || true

            exit 1
        '''
    }
}
        stage('Simulate Pre-Deploy Failure') {
    when {
        expression {
            return params.FAILURE_TEST == 'BEFORE_DEPLOY'
        }
    }

    steps {
        sh '''
            mkdir -p reports

            echo "[ERROR] Simulated pre-deployment failure" \
                > reports/pipeline-failure.log

            echo "[TEST] Production must remain unchanged"

            exit 1
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
        stage('Simulate Post-Deploy Failure') {
    when {
        expression {
            return params.FAILURE_TEST == 'AFTER_DEPLOY'
        }
    }

    steps {
        sh '''
            mkdir -p reports

            echo "[ERROR] Simulated post-deployment failure" \
                > reports/pipeline-failure.log

            echo "[TEST] Automatic rollback must restore previous image"

            exit 1
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
        sh '''
            echo "[AI] Analyzing pipeline failure"

            mkdir -p reports

            if [ -x .venv/bin/python ]; then

                {
                    echo "Jenkins Build: ${BUILD_NUMBER}"
                    echo "Pipeline status: FAILURE"
                    echo "Deploy started: ${DEPLOY_STARTED}"

                    for LOG in \
                        reports/testing-container.log \
                        reports/docker-failure.log \
                        reports/pipeline-failure.log
                    do
                        if [ -f "$LOG" ]; then
                            echo "===== $LOG ====="
                            tail -n 100 "$LOG"
                        fi
                    done

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