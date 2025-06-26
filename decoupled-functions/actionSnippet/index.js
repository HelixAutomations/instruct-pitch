const { app } = require("@azure/functions");
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

async function actionSnippetHandler(req, context) {
    context.log("actionSnippet invoked");

    if (req.method !== "POST") {
        return { status: 405, body: "Method not allowed" };
    }

    const baseUrl =
        process.env.SNIPPET_APPROVE_BASE_URL ||
        "https://instructions-vnet-functions.azurewebsites.net/api/approveSnippetEdit";

    let code = process.env.SNIPPET_APPROVE_CODE;
    if (!code) {
        const secretName = process.env.SNIPPET_APPROVE_CODE_SECRET || "approveSnippetEdit-code";
        const secretClient = new SecretClient("https://helix-keys.vault.azure.net/", new DefaultAzureCredential());
        try {
            const secret = await secretClient.getSecret(secretName);
            code = secret.value;
        } catch (err) {
            context.error("Failed to retrieve approve snippet code", err);
            return { status: 500, body: "Unable to retrieve approve snippet code" };
        }
    }

    const url = `${baseUrl}?code=${code}`;

    let body;
    try {
        body = await req.json();
    } catch {
        return { status: 400, body: "Invalid JSON" };
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const text = await response.text();
            context.error("Approve snippet service error:", text);
            return { status: 500, body: "Failed to approve snippet edit" };
        }
        const data = await response.text();
        return { status: 200, body: data, headers: { "Content-Type": "application/json" } };
    } catch (err) {
        context.error("Error calling approve snippet service", err);
        return { status: 500, body: "Error calling approve snippet service" };
    }
}

app.http("actionSnippet", {
    methods: ["POST"],
    authLevel: "function",
    handler: actionSnippetHandler,
});

module.exports = app;
