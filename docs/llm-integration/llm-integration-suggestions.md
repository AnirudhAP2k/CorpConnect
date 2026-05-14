# Adding LLM Capabilities to Evently

## Executive Summary
Using a Large Language Model (LLM) alongside the current `all-MiniLM-L6-v2` setup would be a significant step forward for the **Evently** platform. 

### The "Why": Complementary Technologies
Right now, the application uses **`all-MiniLM-L6-v2`**, which is an *encoder-based* sentence transformer. It is blazingly fast and highly efficient for creating vector embeddings, making it the perfect tool for **Retrieval and Matching** (e.g., semantic search, organization matchmaking, and event recommendations). However, it cannot generate text or "understand" context in a conversational way.

By introducing a **Generative LLM** (like Llama 3, Mistral, OpenAI GPT-4o, or Claude 3.5), we cover the other half of AI capabilities: **Generation, Reasoning, and Conversation**. 

These two models actually work perfectly together in a pattern called **RAG (Retrieval-Augmented Generation)**. `MiniLM` finds the relevant data from the database, and the LLM formats it into a human-readable, intelligent response.

---

## High-Impact LLM Features for the Platform

### 1. Real-Time Event Assistant (Chatbot)
Instead of static FAQ pages, provide an AI concierge for each event or organization.
* **For Members:** A chat interface where attendees can ask, *"What time is the keynote on Friday?"* or *"Are there any vegan food options at this venue?"* The LLM uses `MiniLM` to pull the specific event details and answers conversationally in real-time.
* **Benefit:** Drastically reduces the support burden on event organizers.

### 2. Conversational Matchmaking Explanations
Matchmaking using embeddings is already in place. An LLM can add the "Why".
* **Example:** Instead of just showing a user a recommended organization, the LLM can generate a personalized hook: *"We matched you with the 'Tech Innovators Guild' because you both have a strong focus on AI development and they are hosting a networking event in your city next week."*
* **Benefit:** Increases click-through rates and makes recommendations feel highly personalized.

### 3. Sentiment Analysis and Feedback Summarization
After an event concludes, organizers often collect hundreds of feedback forms or chat logs.
* **Feature:** Feed this raw text into an LLM to perform sentiment analysis and generate an executive summary. The AI can highlight: *"Overall sentiment was 85% positive. Attendees loved the guest speaker, but there were multiple complaints about the Wi-Fi speed in Hall B."*
* **Benefit:** Gives organizations instant, actionable insights without forcing them to read through hundreds of raw survey responses.

### 4. Smart Content Generation for Organizers
Creating compelling event descriptions and promotional material is time-consuming.
* **Feature:** An "AI Writer" button next to text inputs. An organizer can type a rough draft like *"Tech meetup, next Friday, pizza provided, talking about React."* The LLM instantly expands this into a professional, engaging event description, complete with suggested agendas.
* **Benefit:** Lowers the barrier to entry for users creating events, ensuring higher quality content across the platform.

### 5. Automated Triage and Support for Admin
For platform admins, if someone reports an issue with an organization or an event, an LLM can automatically categorize the ticket (e.g., *Billing, Urgent Safety, General Query*), extract key entities, and suggest a response.

### 6. Agentic Workflows and Automation (Powered by n8n)
To truly supercharge the platform and make it cutting-edge, we can integrate **n8n** to build Agentic workflows. This elevates the AI from being a simple "answering machine" to an active agent that takes action on behalf of users.
* **Feature:** Organizers can define natural language automations. For example: *"If someone registers for my event and indicates dietary restrictions, automatically email the caterer to add one vegan meal, and reply to the attendee thanking them for letting us know."*
* **Implementation:** Use Evently as the trigger source via webhooks, send the data to an **n8n** workflow, where an Agentic LLM evaluates the context, determines the required outcome, and triggers independent follow-up actions (like sending an email, interacting with third-party APIs, or sending a Slack message).
* **Benefit:** It transforms the platform into an autonomous event-management co-pilot. Organizers save hours of manual coordination as the AI actively performs operational tasks rather than just providing text suggestions.

---

## Suggested Implementation Strategy

If moving forward with this, the following architecture is recommended:

1. **Keep `all-MiniLM-L6-v2`** exactly where it is. It is currently handling the vector similarity / embedding tasks perfectly and very cheaply.
2. **Add an LLM API Integration** in the AI microservice. 
   - Options for open-source/self-hosted (to avoid recurring costs): **Llama-3-8B** or **Mistral-7B** via providers like Groq, Together AI, or own infrastructure.
   - Options for easiest integration with highest reasoning capability: **OpenAI (GPT-4o-mini)** or **Anthropic (Claude 3.5 Haiku)** APIs.
3. **Connect them via RAG:** When a user asks the chatbot a question, use `MiniLM` to search the database vectors for the answer, then pass that data to the LLM to write the final response.
