1️⃣ Problem Statement

AI for Grievance Redressal in Public Governance

Public governance bodies receive thousands of citizen grievances daily across areas such as civic infrastructure, sanitation, public safety, utilities, healthcare, education, and administrative delays. These grievances are often unstructured, manually reviewed, and routed slowly, resulting in backlogs, delayed resolutions, and lack of accountability.

There is a critical need for an AI-powered system that can automatically analyze, prioritize, and route grievances based on urgency, impact, and jurisdiction—enabling faster, fairer, and more transparent governance.

2️⃣ Project Name

CivicCare AI – AI-Powered Public Grievance Redressal System

3️⃣ Team Name
VisionaryMinds

4️⃣ Deployed Link (Optional)

🔗 Live Application:
https://civiccare-ai-public-grievance-redressal-573308704802.us-west1.run.app/

5️⃣ 2-Minute Demonstration Video Link

🎥 Demo Video:
https://drive.google.com/file/d/1oU86fe05ugUERKmADjK92wm2YTh361Jt/view?usp=drivesdk

6️⃣ PPT Link

📊 Presentation Deck (PDF):
https://drive.google.com/file/d/1q9IIJw1XveLsFjZGeCGMXC7BizK7idNq/view?usp=drivesdk

Project Overview

CivicCare AI is an AI-assisted grievance intelligence platform designed to support public authorities in handling citizen complaints more efficiently.

Instead of treating grievances as simple tickets, CivicCare AI converts unstructured citizen complaints into prioritized, explainable action queues for government officers. The system respects real administrative structures by routing grievances based on city-level jurisdiction with state-level oversight, while keeping humans in control of final decisions.

Key Highlights

AI-assisted grievance classification and prioritization

City-wise routing for officers and state-level oversight for administrators

Human-in-the-loop decision making (AI assists, officers decide)

Explainable AI outputs for transparency

Designed to augment existing grievance mechanisms, not replace them

Setup & Installation Instructions
Prerequisites

Node.js (v18 or above)

npm or yarn

Google Gemini API key

Installation Steps
# Clone the repository
git clone <your-repo-link>

# Navigate to project directory
cd civiccare-ai

# Install dependencies
npm install

# Create environment file
touch .env


Add the following to .env:

VITE_GEMINI_API_KEY=your_google_gemini_api_key

# Start development server
npm run dev


The application will be available at:

http://localhost:5173

Usage Instructions
Step 1: Role & Jurisdiction Selection

On launch, users select their role:

Citizen

Officer

Administrator

They also select their State and City (used for routing and oversight).

Step 2: Citizen Flow

Submit a grievance with description and optional photos

Grievance is tagged with city and state

AI analyzes the complaint and suggests priority

Citizen can track grievance status

Step 3: Officer Flow

Officers view grievances assigned to their city

Grievances are automatically sorted by AI-assisted priority

Officers can update status (Pending → In Progress → Resolved)

AI explanations assist decision-making but do not enforce actions

Step 4: Administrator Flow

Administrators view state-level analytics

City-wise backlog, critical cases, and escalations are visible

Enables accountability and performance monitoring

AI & Decision Logic (Brief)

AI assists with:

Grievance categorization

Urgency and severity inference

Explainable prioritization reasoning

Rule-based safeguards ensure:

Jurisdiction-correct routing

Minimum priority for safety-critical cases

Human oversight for all final actions

⚠️ AI recommendations assist officers and do not replace human decision-making.

Relevant Screenshots

https://drive.google.com/drive/folders/1FXam0swV-qxr31RU9INExXbmb0y1EHKD?usp=sharing

Suggested screenshots:

Role & City/State Selection Screen

Citizen Grievance Submission Form

Officer Priority Dashboard (City-wise)

Administrator State-Level Analytics View

Impact & Outcome (Pilot Simulation)

Faster grievance triage through AI-assisted prioritization

Improved visibility of critical issues at city and state levels

Reduced manual effort for officers

Transparent, explainable governance workflows

Disclaimer

This project is a prototype developed for evaluation and demonstration purposes.
It does not handle real citizen identity verification and is designed to showcase AI-assisted governance workflows in a safe, responsible manner.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
