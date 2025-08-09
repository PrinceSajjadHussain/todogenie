# AI-Powered To-Do Application with Gemini & Supabase

This is a professional, AI-enhanced To-Do application designed to showcase the power of modern web technologies and artificial intelligence. It allows users to manage tasks, automatically generate actionable subtasks using Google's Gemini 1.5 Pro, and translate tasks into any language on demand.

 

## ✨ Features

- **📝 Task Management:** Create, view, and manage tasks with titles, descriptions, priorities, and due dates.
- **🤖 AI-Generated Subtasks:** Automatically break down complex tasks into smaller, manageable subtasks with a single click.
- **🌐 On-Demand Translation:** Translate tasks into any language, with translations cached for performance.
- **🔍 Advanced Filtering:** Easily search and filter tasks by completion status, priority, or keywords.
- **💾 Persistent Storage:** All data is securely stored in a Supabase PostgreSQL database.
- **💅 Polished UI:** A clean, modern, and responsive user interface built with Tailwind CSS and shadcn/ui.

## 🚀 Tech Stack

| Technology | Description |
| :--- | :--- |
| **React** | A JavaScript library for building user interfaces. |
| **Vite** | A next-generation frontend tooling that provides a faster and leaner development experience. |
| **TypeScript** | A typed superset of JavaScript that compiles to plain JavaScript. |
| **Tailwind CSS** | A utility-first CSS framework for rapidly building custom designs. |
| **shadcn/ui** | A collection of beautifully designed, accessible, and customizable UI components. |
| **Supabase** | An open-source Firebase alternative for building secure and scalable backends. |
| **Gemini 1.5 Pro** | Google's next-generation multimodal model, used for AI-powered subtask generation and translation. |
| **Vercel** | A cloud platform for static sites and Serverless Functions that fits perfectly with a Vite-based workflow. |

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/ai-todo-app.git
    cd ai-todo-app
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables:
    ```env
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_ANON_KEY"
    ```
    You will also need to set the `GEMINI_API_KEY` in your Supabase project's Edge Function settings.

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:8080`.

## 🚀 Deployment

This application is optimized for deployment on Vercel. To deploy your own instance, follow these steps:

1.  **Fork this repository.**
2.  **Create a new project on Vercel** and connect it to your forked repository.
3.  **Configure the environment variables** in the Vercel project settings, including `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `GEMINI_API_KEY`.
4.  **Deploy!** Vercel will automatically build and deploy your application.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
