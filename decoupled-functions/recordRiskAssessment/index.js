const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const sql = require('mssql');
const { getSqlPool } = require('../sqlClient');

const keyVaultName = process.env.KEY_VAULT_NAME;
if (!keyVaultName && !process.env.KEY_VAULT_URL) {
    throw new Error('Key Vault not specified! Set KEY_VAULT_NAME or KEY_VAULT_URL');
}
const vaultUrl = process.env.KEY_VAULT_URL || `https://${keyVaultName}.vault.azure.net/`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(vaultUrl, credential);
let passwordPromise;

async function ensureDbPassword() {
    if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
    if (!passwordPromise) {
        const secretName = process.env.DB_PASSWORD_SECRET || 'instructionsadmin-password';
        passwordPromise = secretClient.getSecret(secretName).then(s => {
            process.env.DB_PASSWORD = s.value;
            return s.value;
        });
    }
    return passwordPromise;
}

module.exports = async function (context, req) {
    context.log('recordRiskAssessment function triggered');

    if (req.method !== 'POST') {
        context.res = { status: 405, body: 'Method not allowed' };
        return;
    }

    const body = req.body || {};
    const { InstructionRef, MatterId } = body;
    if (!InstructionRef && !MatterId) {
        context.res = { status: 400, body: 'Missing InstructionRef or MatterId' };
        return;
    }

    try {
        await ensureDbPassword();
        const pool = await getSqlPool();
        await pool.request()
            .input('MatterId', sql.NVarChar(50), MatterId || InstructionRef)
            .input('InstructionRef', sql.NVarChar(50), InstructionRef || null)
            .input('RiskAssessor', sql.NVarChar(100), body.RiskAssessor || null)
            .input('ComplianceDate', sql.Date, body.ComplianceDate || null)
            .input('ComplianceExpiry', sql.Date, body.ComplianceExpiry || null)
            .input('ClientType', sql.NVarChar(255), body.ClientType || null)
            .input('ClientType_Value', sql.Int, body.ClientType_Value || null)
            .input('DestinationOfFunds', sql.NVarChar(255), body.DestinationOfFunds || null)
            .input('DestinationOfFunds_Value', sql.Int, body.DestinationOfFunds_Value || null)
            .input('FundsType', sql.NVarChar(255), body.FundsType || null)
            .input('FundsType_Value', sql.Int, body.FundsType_Value || null)
            .input('HowWasClientIntroduced', sql.NVarChar(255), body.HowWasClientIntroduced || null)
            .input('HowWasClientIntroduced_Value', sql.Int, body.HowWasClientIntroduced_Value || null)
            .input('Limitation', sql.NVarChar(255), body.Limitation || null)
            .input('Limitation_Value', sql.Int, body.Limitation_Value || null)
            .input('SourceOfFunds', sql.NVarChar(255), body.SourceOfFunds || null)
            .input('SourceOfFunds_Value', sql.Int, body.SourceOfFunds_Value || null)
            .input('ValueOfInstruction', sql.NVarChar(255), body.ValueOfInstruction || null)
            .input('ValueOfInstruction_Value', sql.Int, body.ValueOfInstruction_Value || null)
            .input('RiskAssessmentResult', sql.NVarChar(255), body.RiskAssessmentResult || null)
            .input('RiskScore', sql.Int, body.RiskScore || null)
            .input('RiskScoreIncrementBy', sql.Int, body.RiskScoreIncrementBy || null)
            .input('TransactionRiskLevel', sql.NVarChar(255), body.TransactionRiskLevel || null)
            .input('ClientRiskFactorsConsidered', sql.Bit, body.ClientRiskFactorsConsidered ? 1 : 0)
            .input('TransactionRiskFactorsConsidered', sql.Bit, body.TransactionRiskFactorsConsidered ? 1 : 0)
            .input('FirmWideAMLPolicyConsidered', sql.Bit, body.FirmWideAMLPolicyConsidered ? 1 : 0)
            .input('FirmWideSanctionsRiskConsidered', sql.Bit, body.FirmWideSanctionsRiskConsidered ? 1 : 0)
            .query(`INSERT INTO RiskAssessment (
        MatterId, InstructionRef, RiskAssessor, ComplianceDate, ComplianceExpiry,
        ClientType, ClientType_Value, DestinationOfFunds, DestinationOfFunds_Value,
        FundsType, FundsType_Value, HowWasClientIntroduced, HowWasClientIntroduced_Value,
        Limitation, Limitation_Value, SourceOfFunds, SourceOfFunds_Value,
        ValueOfInstruction, ValueOfInstruction_Value, RiskAssessmentResult,
        RiskScore, RiskScoreIncrementBy, TransactionRiskLevel,
        ClientRiskFactorsConsidered, TransactionRiskFactorsConsidered,
        FirmWideAMLPolicyConsidered, FirmWideSanctionsRiskConsidered)
       VALUES (
        @MatterId, @InstructionRef, @RiskAssessor, @ComplianceDate, @ComplianceExpiry,
        @ClientType, @ClientType_Value, @DestinationOfFunds, @DestinationOfFunds_Value,
        @FundsType, @FundsType_Value, @HowWasClientIntroduced, @HowWasClientIntroduced_Value,
        @Limitation, @Limitation_Value, @SourceOfFunds, @SourceOfFunds_Value,
        @ValueOfInstruction, @ValueOfInstruction_Value, @RiskAssessmentResult,
        @RiskScore, @RiskScoreIncrementBy, @TransactionRiskLevel,
        @ClientRiskFactorsConsidered, @TransactionRiskFactorsConsidered,
        @FirmWideAMLPolicyConsidered, @FirmWideSanctionsRiskConsidered)`);

        context.res = { status: 200, body: { ok: true } };
    } catch (err) {
        context.log.error('recordRiskAssessment error:', err);
        context.res = { status: 500, body: { error: 'Failed to insert risk assessment', detail: err.message } };
    }
};
