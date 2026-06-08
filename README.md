# MY RESEARCH HELPER SYSTEM

## Overview

The Research Helper System is a web-based platform that removes the friction from academic research by assisting students in identifying research topics, supervisors, and collaborators using intelligent matching and AI-driven tools

## Features

- AI-powered research assistance using DeepSeek AI
- Research topic generation
- Literature review support
- Research topic refinement
- Research supervisor matching
- Academic papers database
- Research peer collaboration

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- MongoDB

### AI Integration
- DeepSeek AI API


## Project Structure

research-helper-system/
│
├── frontend/
│   ├── html/
│   ├── css/
│   └── js/
│   
│
├── backend/
│   ├── config/
│   │   ├── config.js
│   │   └── db.js
│   │
│   ├── prompts/
│   │   └── lumi.js
│   │
│   ├── utils/
│   ├── routes/
│   ├── middleware/
│   └── services/
│
├── database/
│   └── sample-data.json
│
├── server.js
├── index.html
├── .env.example
├── package.json
└── README.md


## Installation

### Prerequisites

- Node.js (v18 or later)
- MongoDB
- npm
- GraphicsMagick or ImageMagick (required by pdf2pic)

### Step 1: Clone or Extract the Project

```bash
git clone <repository-url>
```
then cd name-of-project

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root and add:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

DEEPSEEK_API_KEY=your_deepseek_api_key

JWT_SECRET=your_jwt_secret
```

### Step 4: Start MongoDB

Ensure MongoDB is running locally or provide a MongoDB Atlas connection string.

### Step 5: Run the Application

Development Mode:

```bash
npm run dev
```

Production Mode:

```bash
npm start
```

### Step 6: Access the Application

Open:

```
http://localhost:5000
```

## Sample Login Credentials

If applicable:

| Role | Email | Password |
|--------|---------|---------|
| User | demo@example.com | password123 |


## License

This project was developed for academic and research purposes.