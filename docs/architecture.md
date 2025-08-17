# System Architecture

This document outlines how the main components in this repository interact.

## Component Roles

- **Client (React)** – collects instruction details and initiates payments.
- **Backend (Express)** – serves APIs for the client, retrieves secrets from Azure Key Vault and communicates with external services.
- **Database (SQL Server)** – stores instruction information and payment records.
- **Azure Key Vault** – holds connection strings and other secrets required by the backend and Azure Functions.
- **Azure Blob Storage** – stores uploaded documents from the client.
- **(Payments)** – Legacy ePDQ removed; Stripe integration pending (placeholders only).
- **Azure Functions** – processes asynchronous tasks such as deal capture using the same Key Vault secrets.

## Data Flow

1. The **client** submits instruction data and file uploads to the **backend**.
2. The **backend** accesses secrets from **Key Vault** to connect to the **database** and **Blob Storage** (Stripe keys will be added once integration proceeds).
3. Uploaded files are saved to **Blob Storage** and instruction data is stored in the **database**.
4. (Planned) When a payment is required, the **backend** will create a Stripe PaymentIntent and confirm it client-side.
5. Certain events trigger **Azure Functions** which also use Key Vault secrets and may update the **database** independently of the main backend.

## Diagram

```mermaid
flowchart LR
    Client-->Backend
    Backend-->KeyVault
    Backend-->SQLDB[Database]
    Backend-->Blob[Blob Storage]
    %% Payments layer (Stripe planned)
    Backend-->Payments[(Stripe - planned)]
    Backend-->Functions[Azure Functions]
    Functions-->SQLDB
    Functions-->KeyVault
```

### Error Handling

Legacy Barclays ePDQ handling & SHA signing logic has been removed. Stripe specific
error handling (webhooks, 3‑D Secure events) will be documented once implemented.
