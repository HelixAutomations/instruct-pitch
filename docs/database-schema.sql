CREATE TABLE [dbo].[Deals] (
    [DealId]             INT            IDENTITY (1, 1) NOT NULL,
    [InstructionRef]     NVARCHAR (50)  NULL,
    [ProspectId]         INT            NULL,
    [Passcode]           NVARCHAR (50)  NULL,
    [ServiceDescription] NVARCHAR (255) NOT NULL,
    [Amount]             MONEY          NOT NULL,
    [AreaOfWork]         NVARCHAR (100) NOT NULL,
    [PitchedBy]          NVARCHAR (100) NOT NULL,
    [PitchedDate]        DATE           NOT NULL,
    [PitchedTime]        TIME (0)       NOT NULL,
    [PitchValidUntil]    DATE           NULL,
    [Status]             NVARCHAR (20)  NOT NULL,
    [IsMultiClient]      BIT            DEFAULT ((0)) NOT NULL,
    [LeadClientId]       INT            NULL,
    [LeadClientEmail]    NVARCHAR (255) NULL,
    [CloseDate]          DATE           NULL,
    [CloseTime]          TIME (0)       NULL,
    PRIMARY KEY CLUSTERED ([DealId] ASC)
);

CREATE TABLE [dbo].[DealJointClients] (
    [DealJointClientId] INT            IDENTITY (1, 1) NOT NULL,
    [DealId]            INT            NOT NULL,
    [ClientId]          INT            NULL,
    [ProspectId]        INT            NULL,
    [ClientEmail]       NVARCHAR (255) NOT NULL,
    [HasSubmitted]      BIT            DEFAULT ((0)) NOT NULL,
    [SubmissionDate]    DATETIME       NULL,
    [IsLeadClient]      BIT            DEFAULT ((0)) NOT NULL,
    PRIMARY KEY CLUSTERED ([DealJointClientId] ASC),
    FOREIGN KEY ([DealId]) REFERENCES [dbo].[Deals] ([DealId])
);

CREATE TABLE [dbo].[Documents] (
    [DocumentId]     INT            IDENTITY (1, 1) NOT NULL,
    [InstructionRef] NVARCHAR (50)  NOT NULL,
    [DocumentType]   NVARCHAR (50)  NULL,
    [FileName]       NVARCHAR (200) NULL,
    [BlobUrl]        NVARCHAR (400) NULL,
    [FileSizeBytes]  INT            NULL,
    [UploadedBy]     NVARCHAR (100) NULL,
    [UploadedAt]     DATETIME2 (7)  DEFAULT (sysdatetime()) NOT NULL,
    [Notes]          NVARCHAR (200) NULL,
    PRIMARY KEY CLUSTERED ([DocumentId] ASC),
    FOREIGN KEY ([InstructionRef]) REFERENCES [dbo].[Instructions] ([InstructionRef])
);

CREATE TABLE [dbo].[Instructions] (
    [InstructionRef]       NVARCHAR (50)   NOT NULL,
    [Stage]                NVARCHAR (50)   DEFAULT ('instruction') NOT NULL,
    [ClientType]           NVARCHAR (20)   NOT NULL,
    [HelixContact]         NVARCHAR (200)  NULL,
    [ConsentGiven]         BIT             DEFAULT ((0)) NOT NULL,
    [InternalStatus]       NVARCHAR (50)   NULL,
    [SubmissionDate]       DATE            DEFAULT (CONVERT([date],sysdatetime())) NOT NULL,
    [SubmissionTime]       TIME (7)        DEFAULT (CONVERT([time],sysdatetime())) NOT NULL,
    [LastUpdated]          DATETIME2 (7)   DEFAULT (sysdatetime()) NOT NULL,
    [ClientId]             NVARCHAR (50)   NULL,
    [RelatedClientId]      NVARCHAR (50)   NULL,
    [MatterId]             NVARCHAR (50)   NULL,
    [Title]                NVARCHAR (20)   NULL,
    [FirstName]            NVARCHAR (100)  NULL,
    [LastName]             NVARCHAR (100)  NULL,
    [Nationality]          NVARCHAR (100)  NULL,
    [NationalityAlpha2]    NVARCHAR (10)   NULL,
    [DOB]                  DATE            NULL,
    [Gender]               NVARCHAR (20)   NULL,
    [Phone]                NVARCHAR (50)   NULL,
    [Email]                NVARCHAR (200)  NULL,
    [PassportNumber]       NVARCHAR (100)  NULL,
    [DriversLicenseNumber] NVARCHAR (100)  NULL,
    [IdType]               NVARCHAR (50)   NULL,
    [HouseNumber]          NVARCHAR (50)   NULL,
    [Street]               NVARCHAR (200)  NULL,
    [City]                 NVARCHAR (100)  NULL,
    [County]               NVARCHAR (100)  NULL,
    [Postcode]             NVARCHAR (20)   NULL,
    [Country]              NVARCHAR (100)  NULL,
    [CountryCode]          NVARCHAR (10)   NULL,
    [CompanyName]          NVARCHAR (200)  NULL,
    [CompanyNumber]        NVARCHAR (50)   NULL,
    [CompanyHouseNumber]   NVARCHAR (50)   NULL,
    [CompanyStreet]        NVARCHAR (200)  NULL,
    [CompanyCity]         NVARCHAR (100)  NULL,
    [CompanyCounty]        NVARCHAR (100)  NULL,
    [CompanyPostcode]      NVARCHAR (20)   NULL,
    [CompanyCountry]       NVARCHAR (100)  NULL,
    [CompanyCountryCode]   NVARCHAR (10)   NULL,
    [Notes]                NVARCHAR (MAX)  NULL,
    [PaymentMethod]        NVARCHAR (50)   NULL,
    [PaymentResult]        NVARCHAR (50)   NULL,
    [PaymentAmount]        DECIMAL (18, 2) NULL,
    [PaymentProduct]       NVARCHAR (100)  NULL,
    [AliasId]              NVARCHAR (100)  NULL,
    [OrderId]              NVARCHAR (100)  NULL,
    [SHASign]              NVARCHAR (128)  NULL,
    [PaymentTimestamp]     DATETIME2 (7)   NULL,
    PRIMARY KEY CLUSTERED ([InstructionRef] ASC)
);

CREATE TABLE [dbo].[IDVerifications]
(
    [InternalId] INT IDENTITY (1, 1) NOT NULL,
    [InstructionRef] NVARCHAR (50) NULL,
    [MatterId] NVARCHAR (50) NULL,
    [DealJointClientId]          INT            NULL,
    [ClientId]                   INT            NULL,
    [ProspectId]                 INT            NULL,

[ClientEmail]                NVARCHAR
(255) NOT NULL,
    [IsLeadClient]               BIT            DEFAULT
((0)) NOT NULL,
    [AdditionalIDDate]           DATE           NULL,
    [AdditionalIDTime]           TIME
(7)       NULL,
    [EIDCheckId]                 NVARCHAR
(100) NULL,
    [EIDProvider]                NVARCHAR
(100) NULL,
    [EIDStatus]                  NVARCHAR
(20)  DEFAULT
('completed') NULL,
    [EIDScore]                   FLOAT (53)     NULL,
    [EIDRawResponse]             NVARCHAR (MAX) NULL,
    [EIDCheckedDate]             DATE           NULL,
    [EIDCheckedTime]             TIME (7)       NULL,
    [CheckExpiry]                DATE           NULL,
    [EIDOverallResult]           NVARCHAR (50)  NULL,
    [PEPAndSanctionsCheckResult] NVARCHAR (255) NULL,
    [AddressVerificationResult]  NVARCHAR (255) NULL,

PRIMARY KEY CLUSTERED
([InternalId] ASC),
    FOREIGN KEY
([MatterId]) REFERENCES [dbo].[Instructions]
([InstructionRef]),
    CONSTRAINT [FK_IDVerifications_DealJointClient] FOREIGN KEY
([DealJointClientId]) REFERENCES [dbo].[DealJointClients]
([DealJointClientId])
);
CREATE TABLE [dbo].[RiskAssessment] (
    [MatterId]                         NVARCHAR (50)  NOT NULL,
    [InstructionRef]                   NVARCHAR (50)  NULL,
    [RiskAssessor]                     NVARCHAR (100) NULL,
    [ComplianceDate]                   DATE           NULL,
    [ComplianceExpiry]                 DATE           NULL,
    [ClientType]                       NVARCHAR (255) NULL,
    [ClientType_Value]                 INT            NULL,
    [DestinationOfFunds]               NVARCHAR (255) NULL,
    [DestinationOfFunds_Value]         INT            NULL,
    [FundsType]                        NVARCHAR (255) NULL,
    [FundsType_Value]                  INT            NULL,
    [HowWasClientIntroduced]           NVARCHAR (255) NULL,
    [HowWasClientIntroduced_Value]     INT            NULL,
    [Limitation]                       NVARCHAR (255) NULL,
    [Limitation_Value]                 INT            NULL,
    [SourceOfFunds]                    NVARCHAR (255) NULL,
    [SourceOfFunds_Value]              INT            NULL,
    [ValueOfInstruction]               NVARCHAR (255) NULL,
    [ValueOfInstruction_Value]         INT            NULL,
    [RiskAssessmentResult]             NVARCHAR (255) NULL,
    [RiskScore]                        INT            NULL,
    [RiskScoreIncrementBy]             INT            NULL,
    [TransactionRiskLevel]             NVARCHAR (255) NULL,
    [ClientRiskFactorsConsidered]      BIT            NULL,
    [TransactionRiskFactorsConsidered] BIT            NULL,
    [FirmWideAMLPolicyConsidered]      BIT            NULL,
    [FirmWideSanctionsRiskConsidered]  BIT            NULL,
    PRIMARY KEY CLUSTERED ([MatterId] ASC),
    FOREIGN KEY ([InstructionRef]) REFERENCES [dbo].[Instructions] ([InstructionRef])
);