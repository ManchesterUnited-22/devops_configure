
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
    }

    stages {

        // ==========================================
        // 01. CHECKOUT SOURCE CODE
        // ==========================================

        stage('Checkout') {
            steps {
                script {
                    env.DEPLOY_STARTED = 'false'
                }

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

                    echo "[CONFIG] Build: ${BUILD_NUMBER}"
                    echo "[CONFIG] Failure test: ${FAILURE_TEST}"
                    echo "[CONFIG] AI review: ${RUN_AI_REVIEW}"
                '''
            }
        }

        // ==========================================
        // 02. SYSTEM PREFLIGHT CHECK
        // ==========================================

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

        // ==========================================
        // 03. PYTHON VIRTUAL ENVIRONMENT
        // ==========================================

        stage('Setup Python Environment') {
            steps {
                sh '''
                    if [ ! -x .venv/bin/python ]; then
                        echo "[PYTHON] Creating virtual environment"
                        python3 -m venv .venv
                    fi

                    if [ ! -f .venv/requirements.snapshot ] || \
                       ! cmp -s requirements.txt .venv/requirements.snapshot
                    then
                        echo "[PYTHON] Installing dependencies"

                        .venv/bin/python -m pip install \
                            -r requirements.txt

                        cp requirements.txt \
                            .venv/requirements.snapshot
                    fi

                    echo "[PYTHON] Environment ready"
                '''
            }
        }

        // ==========================================
        // 04. OPTIONAL AI CODE REVIEW
        // ==========================================

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
                            echo "[AI] Starting code review"

                            .venv/bin/python -m ai.code_review \
                                > reports/ai-code-review.txt

                            cat reports/ai-code-review.txt

                            echo "[AI] Code review completed"
                        '''
                    }
                }
            }
        }

        // ==========================================
        // 05. BUILD DOCKER IMAGE
        // ==========================================

        stage('Build Docker Image') {
            steps {
                sh '''
                    echo "[DOCKER] Building image"

                    time docker build \
                        -t "${IMAGE_NAME}:${BUILD_NUMBER}" .

                    docker image inspect \
                        "${IMAGE_NAME}:${BUILD_NUMBER}" \
                        --format="Image ID: {{.Id}}"
                '''
            }
        }

        // ==========================================
        // 06. TRIVY SECURITY GATE
        // ==========================================

        stage('Security Scan') {
            steps {
                sh '''
                    echo "[SECURITY] Starting Trivy"

                    time bash security/scan.sh \
                        "${IMAGE_NAME}:${BUILD_NUMBER}"
                '''
            }
        }

        // ==========================================
        // 07. TESTING ENVIRONMENT
        // ==========================================

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
                            "http://127.0.0.1:${TEST_PORT}/"
                        then
                            echo "[TEST] HTTP check passed"
                            exit 0
                        fi

                        echo "[TEST] Attempt $i/15 failed"

                        sleep 2
                    done

                    echo "[ERROR] Testing environment failed"

                    echo "[ERROR] Testing HTTP check failed" \
                        > reports/pipeline-failure.log

                    docker ps -a --filter "name=$TEST_CONTAINER"

                    docker logs "$TEST_CONTAINER" || true

                    exit 1
                '''
            }
        }

        // ==========================================
        // 08. SIMULATE FAILURE BEFORE DEPLOYMENT
        // ==========================================

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
                        | tee reports/pipeline-failure.log

                    echo "[TEST] Production must remain unchanged"

                    exit 1
                '''
            }
        }

        // ==========================================
        // 09. BACKUP CURRENT DEPLOYMENT
        // ==========================================

        stage('Backup Current Deployment') {
            steps {
                sh '''
                    if docker inspect "${CONTAINER_NAME}" \
                        >/dev/null 2>&1
                    then
                        docker inspect \
                            --format="{{.Image}}" \
                            "${CONTAINER_NAME}" > .prev_image

                        echo "[BACKUP] Previous image:"

                        cat .prev_image
                    else
                        echo "[BACKUP] First deployment"
                    fi
                '''
            }
        }

        // ==========================================
        // 10. DEPLOY PRODUCTION CONTAINER
        // ==========================================

        stage('Deploy Container') {
            steps {
                script {
                    env.DEPLOY_STARTED = 'true'
                }

                sh '''
                    set -eu

                    echo "[DEPLOY] Starting deployment"

                    if docker inspect "${CONTAINER_NAME}" \
                        >/dev/null 2>&1
                    then
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

        // ==========================================
        // 11. SIMULATE FAILURE AFTER DEPLOYMENT
        // ==========================================

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
                        | tee reports/pipeline-failure.log

                    echo "[TEST] Automatic rollback must restore previous image"

                    exit 1
                '''
            }
        }

        // ==========================================
        // 12. VERIFY PRODUCTION DEPLOYMENT
        // ==========================================

        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "[HEALTHCHECK] Checking website"

                    for i in $(seq 1 15); do

                        if curl \
                            --connect-timeout 2 \
                            --max-time 5 \
                            --fail \
                            --silent \
                            --show-error \
                            --output /dev/null \
                            "http://127.0.0.1:${HOST_PORT}/"
                        then
                            echo "[HEALTHCHECK] HTTP check passed"

                            docker ps \
                                --filter "name=${CONTAINER_NAME}"

                            docker inspect \
                                --format="{{.State.Status}}" \
                                "${CONTAINER_NAME}"

                            echo "[HEALTHCHECK] Deployment verified"

                            exit 0
                        fi

                        echo "[HEALTHCHECK] Attempt $i/15 failed"

                        sleep 2
                    done

                    echo "[ERROR] Production health check failed" \
                        | tee reports/pipeline-failure.log

                    exit 1
                '''
            }
        }

        // ==========================================
        // 13. UPDATE LATEST IMAGE TAG
        // ==========================================

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

        // ==========================================
        // 14. CLEANUP OLD DOCKER IMAGES
        // ==========================================

        stage('Cleanup Old Images') {
            steps {
                sh '''
                    echo "[CLEANUP] Keeping 3 newest build tags"

                    docker images "${IMAGE_NAME}" \
                        --format '{{.Tag}}' \
                        | grep -E '^[0-9]+$' \
                        | sort -rn \
                        | tail -n +4 \
                        | xargs -r -I{} docker rmi \
                            "${IMAGE_NAME}:{}" || true
                '''
            }
        }
    }

    // ==============================================
    // POST PIPELINE ACTIONS
    // ==============================================

    post {

        // ==========================================
        // SUCCESS
        // ==========================================

        success {
            echo '[SUCCESS] Deployment completed!'
        }

        // ==========================================
        // FAILURE HANDLING
        // ==========================================

        failure {
            echo '[ERROR] Pipeline failed'

            script {

                // ----------------------------------
                // COLLECT DOCKER FAILURE LOGS
                // ----------------------------------

                sh '''
                    mkdir -p reports

                    if [ "${DEPLOY_STARTED:-false}" = "true" ]; then

                        docker logs --tail 100 \
                            "${CONTAINER_NAME}" \
                            > reports/docker-failure.log 2>&1 || true

                    fi
                '''

                // ----------------------------------
                // AUTOMATIC ROLLBACK
                // ----------------------------------

                if (env.DEPLOY_STARTED == 'true') {

                    echo '[ROLLBACK] Starting automatic rollback'

                    catchError(
                        buildResult: 'FAILURE',
                        stageResult: 'FAILURE'
                    ) {
                        sh '''
                            set -eu

                            if [ ! -s .prev_image ]; then

                                echo "[ROLLBACK] No previous image available"

                                exit 1
                            fi

                            PREV=$(cat .prev_image)

                            echo "[ROLLBACK] Previous image: $PREV"

                            docker image inspect "$PREV" >/dev/null

                            if docker inspect "${CONTAINER_NAME}" \
                                >/dev/null 2>&1
                            then
                                docker rm -f "${CONTAINER_NAME}"
                            fi

                            docker run -d \
                                --name "${CONTAINER_NAME}" \
                                --restart unless-stopped \
                                -p "${HOST_PORT}:80" \
                                "$PREV"

                            echo "[ROLLBACK] Checking restored website"

                            for i in $(seq 1 15); do

                                if curl \
                                    --connect-timeout 2 \
                                    --max-time 5 \
                                    --fail \
                                    --silent \
                                    --show-error \
                                    --output /dev/null \
                                    "http://127.0.0.1:${HOST_PORT}/"
                                then
                                    docker tag "$PREV" \
                                        "${IMAGE_NAME}:latest"

                                    echo "[ROLLBACK] HTTP check passed"

                                    echo "[ROLLBACK] Previous image restored successfully"

                                    exit 0
                                fi

                                echo "[ROLLBACK] Attempt $i/15 failed"

                                sleep 2
                            done

                            echo "[ROLLBACK] Restored website failed health check" \
                                >> reports/pipeline-failure.log

                            exit 1
                        '''
                    }

                } else {

                    echo '[ROLLBACK] Not required'
                }

                // ----------------------------------
                // AI INCIDENT ANALYSIS
                // ----------------------------------

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

                                    echo "Failure test: ${FAILURE_TEST}"

                                    echo "Deploy started: ${DEPLOY_STARTED:-false}"

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

                                } | .venv/bin/python -m ai.log_analyzer \
                                    > reports/ai-incident.txt

                                cat reports/ai-incident.txt

                                echo "[AI] Incident analysis completed"

                            else

                                echo "[AI] Python environment unavailable"

                            fi
                        '''
                    }
                }
            }
        }

        // ==========================================
        // ARCHIVE REPORTS AND CLEANUP
        // ==========================================

        cleanup {
            archiveArtifacts(
                artifacts: 'reports/**/*.txt,reports/**/summary.json',
                allowEmptyArchive: true
            )

            sh '''
                rm -f .prev_image

                echo "[SYSTEM] Pipeline finished"
            '''
        }
    }
}
