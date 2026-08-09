# Privacy Policy

**Last updated: July 26, 2026**

## Overview

Sennoric is an open-source AI coding agent with local software and hosted services. Most CLI work happens on your machine, while model inference, accounts, web chat, usage tracking, billing, email, vision, and connected integrations may send data to remote services. This policy explains what stays local, what Sennoric stores, and which providers process data.

Sennoric operates a hosted API, authentication, usage, billing, email-preference, and chat backend on Cloudflare. Fresco runs on RunPod, the default vision model runs on Hugging Face infrastructure, and logged chat exchanges are sent to Mistral for asynchronous safety classification. Sennoric does not use your conversations for model training unless you explicitly opt in with `/contribute`.

## Local-only features

These stay on your device unless their output is included in a prompt or sent through a hosted feature.

- **Reading, editing, and running code** — the core agent operates on your local filesystem. File contents leave your device only when included as context for the AI model you selected.
- **Integration tokens** — stored in `~/.sennoric/oauth.json` and sent to the corresponding service API, not to Sennoric. Connected data may become prompt context and then be sent to your selected model provider.
  - **GitHub** — repositories, issues, and pull requests available to the granted scopes.
  - **Google** — Google Drive and Google Calendar data available to the granted scopes. Sennoric does not request Gmail access.
  - **Notion** — pages and databases shared with the integration.
  - **Slack** — channels and messages available to the bot token.
- **Voice recording** — recorded to a temporary `.wav` file locally before any hosted transcription.
- **Session memory** — local CLI memory, preferences, and notes are stored under `~/.sennoric/`.
- **Third-party provider keys** — keys you configure are stored locally and sent to the provider they belong to.
- **Local models** — Ollama inference runs on your machine.
- **Extension-to-CLI bridge** — the Chrome extension talks to the local CLI over `127.0.0.1`. That local bridge itself does not contact Sennoric.

## Sennoric hosted account and service data

Sennoric's Cloudflare-hosted backend stores and processes data needed to run accounts and hosted features, including:

- account identifiers, email address, password hash or linked OAuth identifier, verification and reset state, registration IP address, suspension state, and appeal records;
- Sennoric-issued API keys and their status, request counts, token counts, calculated usage cost, allowance windows, and rate-limit records;
- plan and subscription status, credit balances, credit-code redemptions, and Square customer or subscription identifiers;
- signed-in web chat history and chat metadata used to sync conversations across sessions;
- a separate server-side log of message content, model responses, and model-requested tool calls across authenticated browser-session and API-key usage, kept independently of your visible chat history. Historical logs may include requests made before Sennoric required authentication for hosted access. An automated process periodically sends recent role-labeled context, the target user message, and the corresponding assistant response to Mistral for asynchronous safety classification. Every reviewed exchange comes back as one of three outcomes: **safe**, and nothing further happens; **an operational error**, meaning the model, the API, or response parsing failed and the exchange could not be classified at all; this is recorded as a system fault, never as a user-safety violation; or **flagged for human review**, where a member of our team reads the exchange and either dismisses or confirms the finding. Safe rows, operational errors, and dismissed findings are retained for up to 30 days. Unreviewed rows and pending or confirmed findings are retained for up to one year for human review, safety enforcement, and legal compliance. A confirmed finding may lead to suspension of the attached account; suspended users receive access to the appeal process;
- email and announcement preferences, organization membership and invitations, and CLI device-login codes;
- administrative test changes to plan, allowance usage, or credit balances, including who made the change and when.

Sennoric does not store your full payment-card number. Square processes payment details. Announcement subscriptions can exist separately from a Sennoric account, so deleting an account does not by itself unsubscribe a separately registered announcement email.

## Hosted features

### AI model inference

Your prompt and any file contents, command output, page text, or other context included with it are transmitted to the selected model provider.

- **Third-party providers** such as Anthropic, OpenAI, Google Gemini, Groq, Mistral, OpenRouter, and OpenCode receive requests directly when you configure and select them.
- **Fresco** routes through Sennoric's Cloudflare backend at `api.sennoric.com` and then to Fresco inference on RunPod. Hosted access requires a Sennoric account, authenticated by a browser session or Sennoric API key. Usage is tracked account-wide as token-based cost against the Free or Pro allowance and any redeemed credits; per-key request and token totals are also recorded.
- **IP addresses** are collected during registration and used for duplicate-account and abuse detection. Registration IPs are kept with the account; operational rate-limit records expire according to their configured windows.

### Voice transcription and text-to-speech

- **Transcription** uploads locally recorded audio to OpenAI (`whisper-1`) when an OpenAI key is configured, or Groq (`whisper-large-v3-turbo`) otherwise. Transcription is unavailable without a supported provider key.
- **Text-to-speech** sends the text to OpenAI's TTS API. Temporary local audio is deleted after playback.

### Screen vision

Screen-vision and computer-use features capture a screenshot and send it to a vision model. The default is Sennoric's `axion-vision` model hosted on Hugging Face. If you configure another vision provider, the screenshot goes to that provider instead.

### Browser control

The Chrome extension requests broad browser permissions so it can read pages, click elements, fill forms, and capture the visible tab when you direct it. In standalone extension chat, page data sent for model reasoning goes to the provider configured in the extension. When the authenticated local bridge is enabled, Sennoric Desktop can request page reads and actions over a loopback WebSocket; returned page data may then become prompt context sent by Desktop to its configured model provider. If Fresco is selected in either flow, the request follows the Cloudflare-to-RunPod path described above. Provider keys and the bridge pairing token are stored in extension-owned Chrome storage.

### Email and payments

- **Resend** processes account verification, password-reset, invitation, and announcement emails.
- **Square** processes Pro checkout and payment information. Sennoric receives and stores the customer or subscription identifiers and status needed to manage access.

### Training-data contributions (`/contribute`)

Contributing is opt-in. Nothing is submitted merely because a contribution prompt appears.

- The session is redacted first: file contents are stripped and message or tool text is truncated, leaving limited structure, text excerpts, and metadata.
- The redacted session is uploaded to Sennoric's collection endpoint on Cloudflare Workers.
- If the upload fails, the session is stored locally under `~/.sennoric/donations/` and is not uploaded automatically later.
- Use `/contribute optout` to disable contribution prompts or `/contribute skip` to dismiss the current prompt.

## Third-party privacy policies

- RunPod (Fresco inference): https://www.runpod.io/legal/privacy-policy
- Hugging Face (default vision inference): https://huggingface.co/privacy
- Mistral (asynchronous safety classification): https://legal.mistral.ai/terms/privacy-policy
- Cloudflare (hosted backend and contribution endpoint): https://www.cloudflare.com/policies/privacy/
- Square (payments and subscriptions): https://squareup.com/us/en/legal/general/privacy
- Resend (transactional and announcement email): https://resend.com/legal/privacy-policy
- Your configured AI providers and connected integrations: see each provider's privacy policy.

## Your control

- Delete individual signed-in web chats from the chat interface. Deleting your account also removes account identifiers from retained safety-log rows and redacts routine content. A pending or confirmed flagged exchange may remain without account identifiers until its human-review need ends or the one-year retention limit expires.
- Use the unsubscribe link in an announcement email to remove a separate announcement subscription.
- Disconnect an OAuth service with `/oauth revoke <service>`, or delete `~/.sennoric/oauth.json`.
- Use your own provider keys or a local model through Ollama to keep inference off Sennoric's model endpoint.
- Opt out of contribution prompts with `/contribute optout`, and delete local files under `~/.sennoric/donations/` yourself.
- Sennoric is open source, so you can review the code at [github.com/Ravikxx/Sennoric](https://github.com/Ravikxx/Sennoric).

## Contact

For questions, open an issue at [github.com/Ravikxx/Sennoric/issues](https://github.com/Ravikxx/Sennoric/issues) or visit [sennoric.com](https://sennoric.com).
