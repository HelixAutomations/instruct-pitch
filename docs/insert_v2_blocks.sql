-- Insert v2 template blocks and snippets for the Pitch Builder
SET IDENTITY_INSERT dbo.SimplifiedBlocks ON;
INSERT INTO dbo.SimplifiedBlocks
    (BlockId, Title, Description, Placeholder, CreatedBy)
VALUES
    (1, 'Introduction', 'Acknowledge the enquiry.', '[FE Introduction Placeholder]', 'seed'),
    (2, 'Issue Summary', 'Summarise the dispute and possible remedies.', '[Issue Summary Placeholder]', 'seed'),
    (3, 'Scope & Cost', 'Outline our proposed work and costs.', '[Scope & Cost Placeholder]', 'seed'),
    (4, 'Next Steps', 'Required documents and how to instruct us.', '[Next Steps Placeholder]', 'seed'),
    (5, 'Closing', 'Final notes and optional review request.', '[Closing Placeholder]', 'seed');
SET IDENTITY_INSERT dbo.SimplifiedBlocks OFF;
GO

INSERT INTO dbo.SimplifiedBlockSnippets
    (BlockId, Label, Content, SortOrder, IsApproved, CreatedBy)
VALUES
    (1, 'Standard Acknowledgment', 'Thank you for your enquiry to Helix Law. We''re a specialist firm of solicitors only dealing with litigation of disputes and we act nationally. We often deal with disputes such as yours and I am confident we are well-placed to assist in relation to your matter.', 1, 1, 'seed'),
    (1, 'Follow-Up After Call', 'Thank you for your enquiry and for your time on the phone earlier. It was good speaking with you.\n\nThe purpose of this email is to briefly follow up on our conversation.', 2, 1, 'seed'),
    (1, 'Missed Call Acknowledgment', 'Thank you for your enquiry to Helix Law. I have tried to call you to discuss your matter but was unable to reach you.\n\nAs a starting point, if you prefer, please email me a brief summary of the background and current position. I will briefly review the content and will come back to you and we can take it from there.', 3, 1, 'seed'),
    (1, 'Apology for Delay', 'Thank you for your enquiry to Helix Law. Please accept my apology for the slight delay in my contacting you.\n\nI have only limited information regarding your dispute. As a starting point please can you email me a brief summary of the background and current position. I will briefly review the content and will come back to you and we can take it from there.', 4, 1, 'seed'),

    (2, 'The Dispute', 'The Dispute\n\nYou have provided an initial outline of the position that [INSERT]', 1, 1, 'seed'),
    (2, 'Current Position and Problems', 'We have discussed that you are [INSERT]. You have a dispute with [INSERT] because [INSERT] and have confirmed that [INSERT].\n\nThe dispute with [INSERT] situation creates difficulty for you for obvious reasons, including because [INSERT].\n\nIn addition to the above, additional problems arise and need to be addressed, such as [INSERT].', 2, 1, 'seed'),
    (2, 'Potential Causes of Action and Remedies', 'Potential Causes of Action and Remedies\n\nAssuming that you can evidence the position above, then there are likely to be the following causes of action.\n\nIt is vital that we work together to strategically position you around the following key areas:\n\nX\nY\nZ\n\nI am experienced in dealing with this type of issue and am happy to assist you and the key is from this point on to carefully position you so that you are in a sufficiently strong position that you can force the Defendants to reach a sensible commercial settlement or if they will not do so proceed to court and obtain the same or a better result, while of course putting you in the best possible position to recover the costs you incur in the litigation from them.\n\nIn the context of a dispute worth in the high hundreds of thousands or millions, from a cost v benefit analysis, my initial view is it stacks up for you to incur the costs for the initial review below.', 3, 1, 'seed'),

    (3, 'Initial Review & Advice', 'Initial Steps- Review and Advice\n\nI am experienced in dealing with this type of issue and am happy to assist you. At this initial stage it is necessary and incredibly important to review the background and current position so that we can then advise on your best next steps.\n\nThis will require an initial review of core documents such as [INSERT the contracts, notices, demands, accounts, relevant correspondence set out below] so that we can be as clear as possible on the factual position with companies house and land registry. I then anticipate being able to provide initial advice on your current position and best next steps.', 1, 1, 'seed'),
    (3, 'Shareholder or Statutory Demand', 'In the above context I need to review your situation and the background and current position in more detail, including documents that are relevant to your situation. This will enable me to provide you with initial advice on your current position and your best next steps.\n\nTo assist me in completing the review please provide the relevant documents and a brief summary. On receipt I will confirm our time and cost estimate for our review and advice.', 2, 1, 'seed'),
    (3, 'Cost Estimate', 'We charge on a time recorded basis and record all time in 6 minute units. This includes for emails in and out and telephone attendances, and all steps on your behalf. I am a [Position] and my hourly rate is [Rate]. We work as a team and a number of colleagues may assist in relation to various steps in relation to your matter, at different times. Their time will be recorded and charged on the basis of their hourly rates as applicable from time to time – these are all lower than £395+VAT. For the initial work and review above you will need to budget in the region of approximately [Amount] + VAT. This is an estimate and not a fixed fee; the cost will ultimately depend on the time spent including the scale of documents and enquiries received from you.', 3, 1, 'seed'),
    (3, 'CFA', 'I am aware that you are seeking alternative funding regarding your matter commonly known as a Conditional Fee Agreement, or ''no win, no fee'' agreement. We are not obliged to offer this form of funding but I am happy to consider doing so. This is subject to us entering into a separate funding agreement between us (a contract). Transparently we only offer no win, no fee funding where it stacks up for you and for us and we need to be sufficiently confident in your prospects of success. At this initial stage please therefore provide the initial documents and information I have requested to enable me to initially briefly review whether this will be appropriate.', 4, 1, 'seed'),

    (4, 'Required Documents', 'The contract; Any relevant correspondence; Settlement Agreement; Shareholders'' Agreement; Financial Statements; Invoices or Asset Information', 1, 1, 'seed'),
    (4, 'Instruct Helix Law - Pitch', 'Please confirm your instructions by clicking <b style=''background-color:#FFF4CC;padding:2px 4px;'
>INSTRUCT <a href="[InstructLink]" target="_blank" style=''
color:
#D65541;text-
decoration:
none;font-
weight:
bold;'>HELIX LAW</a></b>. This single link will verify your identity, request the key documents and take funds on account in a quick and transparent checkout process: [CheckoutLink]. Once complete we''ll open a file immediately and send you our Client Care Letter setting out the terms of our retainer. If you have any queries I''m very happy to discuss them without charge.', 2, 1, 'seed'),
(4, 'Meeting Link', 'You are welcome to schedule a meeting using the link below:\n\nhttps://calendly.com/helixlaw-fe', 3, 1, 'seed'),

(5, 'Closing', 'I hope the above helps and look forward to helping resolve your matter.\n\nThere is obviously some degree of complexity factually and legally in relation to your matter. We''re a specialist team and I hope to assist you navigate the process effectively to achieve a positive outcome.\n\nTo be clear, when you have completed the above steps we will review the position and at our discretion will open a file. We will then set out the terms of our retainer and file with you and will ask you to confirm that those terms are accepted. Only at that stage will a retainer be confirmed between us. Although unusual, we may decline to act for you for any reason in which case any monies paid by you will be returned without charge. I hope the above makes sense and is clear but don''t hesitate to contact me if you have any queries and I will be happy to help.', 1, 1, 'seed'),
(5, 'Request for Review', 'I hope the above [and our call] is useful and of course come back to me if I can help you further.\n\nIn the meantime, I''m wondering if you can help me by providing a brief positive Google review of me and Helix Law. We''re a small but specialist team, and this would make a huge difference to us.\n\nIf you don''t mind, please can you give us a brief 5* positive review at the following link:\n\nhttp://bit.ly/2gGwyNJ\n\nYou will need to be signed into Google.\n\nMany thanks in advance.', 2, 1, 'seed');
GO

INSERT INTO dbo.SimplifiedBlockSnippetVersions
    (SnippetId, VersionNumber, Label, Content, SortOrder, BlockId, ApprovedBy, ApprovedAt)
SELECT
    SnippetId,
    Version,
    Label,
    Content,
    SortOrder,
    BlockId,
    'seed' AS ApprovedBy,
    SYSUTCDATETIME() AS ApprovedAt
FROM dbo.SimplifiedBlockSnippets;

INSERT INTO dbo.SnippetEdits
    (SnippetId, ProposedContent, ProposedLabel, ProposedBy)
VALUES
    (1, 'Thank you for contacting Helix Law, hope all is well.', 'Standard Acknowledgment v2', 'tester');
