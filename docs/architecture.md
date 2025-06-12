# System Architecture

This document outlines how the main components in this repository interact.

## Component Roles

- **Client (React)** – collects instruction details and initiates payments.
- **Backend (Express)** – serves APIs for the client, retrieves secrets from Azure Key Vault and communicates with external services.
- **Database (SQL Server)** – stores instruction information and payment records.
- **Azure Key Vault** – holds connection strings and other secrets required by the backend and Azure Functions.
- **Azure Blob Storage** – stores uploaded documents from the client.
- **ePDQ** – third-party payment provider used for card transactions.
- **Azure Functions** – processes asynchronous tasks such as deal capture using the same Key Vault secrets.

## Data Flow

1. The **client** submits instruction data and file uploads to the **backend**.
2. The **backend** accesses secrets from **Key Vault** to connect to the **database**, **Blob Storage** and the **ePDQ** payment gateway.
3. Uploaded files are saved to **Blob Storage** and instruction data is stored in the **database**.
4. When a payment is required, the **backend** sends the details to **ePDQ** and awaits confirmation.
5. Certain events trigger **Azure Functions** which also use Key Vault secrets and may update the **database** independently of the main backend.

## Diagram

```mermaid
flowchart LR
    Client-->Backend
    Backend-->KeyVault
    Backend-->SQLDB[Database]
    Backend-->Blob[Blob Storage]
    Backend-->ePDQ[ePDQ]
    Backend-->Functions[Azure Functions]
    Functions-->SQLDB
    Functions-->KeyVault
```

### Error Handling

When ePDQ returns an XML payload instead of the normal key/value pairs, the
backend now parses the `NCERROR` and `NCERRORPLUS` values. These fields are
included in the JSON response so the client can surface a meaningful error
message while still exposing the raw XML for reference.

All parameters sent to ePDQ are upper‑cased before computing the SHA signature.
This matches the gateway's signing rules and prevents signature mismatches when
additional fields like the 3‑D Secure browser attributes are included.
