
pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        IMAGE_NAME = 'food-our-web'
        CONTAINER_NAME = 'food-our-container'
        HOST_PORT = '8081'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Getting source code from GitHub...'
                checkout scm
                sh 'rm -f .prev_image'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh '''
                    docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .
                    docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_NAME}:latest
                '''
            }
        }

        stage('Deploy Container') {
            steps {
                echo 'Deploying website...'
                sh '''
                    docker inspect -f '{{.Config.Image}}' ${CONTAINER_NAME} > .prev_image 2>/dev/null || true

                    
                    docker rm -f ${CONTAINER_NAME} || true

                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        --restart unless-stopped \
                        -p ${HOST_PORT}:80 \
                        ${IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'Checking website availability...'
                sh '''
                    curl --retry 5 \
                         --retry-connrefused \
                         --retry-delay 2 \
                         -f http://localhost:${HOST_PORT}/
                '''
            }
        }
        stage('Cleanup Old Images') {
            steps {
            sh '''
                docker images ${IMAGE_NAME} --format '{{.Tag}}' \
              | grep -E '^[0-9]+$' | sort -rn | tail -n +4 \
              | xargs -r -I{} docker rmi ${IMAGE_NAME}:{} || true
             '''
    }
}
    }

    post {
        success {
            echo 'Deployment completed successfully!'
        }

        failure {
    echo 'Pipeline failed. Rolling back...'
    sh '''
        if [ -s .prev_image ]; then
            PREV=$(cat .prev_image)
            docker rm -f ${CONTAINER_NAME} || true
            docker run -d --name ${CONTAINER_NAME} --restart unless-stopped \
                -p ${HOST_PORT}:80 "$PREV"
            echo "Đã rollback về $PREV"
        else
            echo "Không có phiên bản trước để rollback"
        fi
    '''
}
    }
}
