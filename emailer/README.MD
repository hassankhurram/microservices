# Express EJS Email Sender

This project is an Express application that uses EJS templates to send emails with Nodemailer. The application supports CORS, rate limiting, and reads configuration from environment variables.

## Features
- **INQUIRY FORM SUBMIT**: This code is intended to be alternative of php email file found in most html templates i.e( contact-form.php ), the users can submit their forms directly to this server and get emails.
- **Express**: A web framework for Node.js, designed for building web applications and APIs.
- **EJS**: Embedded JavaScript templating for rendering HTML with dynamic content.
- **Nodemailer**: A module for Node.js applications to send emails.
- **dotenv**: A module to load environment variables from a `.env` file into `process.env`.
- **CORS**: Middleware for enabling Cross-Origin Resource Sharing.
- **Rate Limiting**: Middleware to limit repeated requests to public APIs and/or endpoints.

## Prerequisites

- **Node.js** (v14.x or higher)
- **npm** (v6.x or higher)

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/hassankhurram/microservices.git
    cd microservices/emailer
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and configure the following variables:

    ```plaintext
    PORT=3000
    CORS_ORIGIN=http://localhost:3000
    RATE_LIMIT_WINDOW_MINUTES=5
    RATE_LIMIT_MAX=10
    MAIL_HOST=smtp.example.com
    MAIL_PORT=587
    MAIL_SECURE=false
    MAIL_AUTH_USER=your-email@example.com
    MAIL_AUTH_PASS=your-email-password
    MAIL_FROM=your-email@example.com
    MAIL_TO=recipient@example.com
    APP_NAME=YourAppName
    ```

    - `PORT`: The port on which the server will run.
    - `CORS_ORIGIN`: The origin allowed for CORS.
    - `RATE_LIMIT_WINDOW_MINUTES`: The window of time in minutes for rate limiting.
    - `RATE_LIMIT_MAX`: The maximum number of requests allowed per window per IP.
    - `MAIL_HOST`: The SMTP host for sending emails.
    - `MAIL_PORT`: The SMTP port.
    - `MAIL_SECURE`: Use `true` for SSL, `false` otherwise.
    - `MAIL_AUTH_USER`: The email address for SMTP authentication.
    - `MAIL_AUTH_PASS`: The password for SMTP authentication.
    - `MAIL_FROM`: The email address from which emails will be sent.
    - `MAIL_TO`: The default recipient email address for inquiries.
    - `APP_NAME`: The name of your application.


## Running with Docker

### Dockerfile

The `Dockerfile` sets up the environment to run the application in a Docker container (optional):

```dockerfile
FROM node:20-alpine

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE $PORT

CMD [ "node", "index.js" ]
```

## Usage

1. Start the server:

    ### using node js

        node index.js
       
    ### using docker

        docker compose up --build -d
    
         

2. Send a POST request to `http://localhost:<port here>/send-email` with the following JSON payload:

    ## CURL:    

    i.e if PORT in .env is set to 3000 or forwarded from server container:

    ```sh
        curl -X POST `http://localhost:3000/send-email`
    ```

    ## POSTMAN: 
    
    POST: http://localhost:3000/send-email

    ```json
    {
      "mail_to": "recipient@example.com",
      "message": "Your inquiry message here.",
      "name": "John Doe"
    }
    ```

## Directory Structure

```plaintext
express-ejs-email-sender/
├── docker-compose.yml
├── Dockerfile
├── example.env
├── index.js
├── package.json
├── package-lock.json
├── README.md
└── views
    └── email.ejs
```


