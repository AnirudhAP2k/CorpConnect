# Know Your Business (KYB) Verification Workflow

To build an application that verifies whether a registered company is legitimate, you need a **Know Your Business (KYB)** workflow. This process should progressively move from simple validations to deeper background checks.

---

## 1. Verification Strategy

Structure your checks in layers to optimize cost and efficiency:

### Level 1: Syntax & Domain Checks (Free / Low Cost)

- **Email Domain Validation**
  - Reject generic domains (e.g., Gmail, Yahoo).
  - Ensure the email domain matches the company website.

- **Website Age Verification**
  - Perform a WHOIS lookup.
  - Flag cases where:
    - Company claims long history (e.g., 10 years)
    - Domain was registered recently (e.g., a few weeks ago)

---

### Level 2: Registry Verification (Source of Truth)

- Use the **Company Registration Number** to query official government databases:
  - India: MCA
  - UK: Companies House
  - US: Secretary of State

- **Success Criteria**
  - Status must be **"Active"**
  - Returned company address must match user input

---

### Level 3: Financial & Physical Presence

- **Tax ID Verification**
  - Validate GSTIN / VAT / EIN
  - Confirms active tax-paying status

- **Address Verification**
  - Use Google Maps API
  - Ensure:
    - Address exists
    - Not a residential property or PO Box (common shell company indicators)

---

## 2. Required Fields for Organization Onboarding Form

Organize fields into logical sections for better UX.

---

### A. Company Identity (Must-Haves)

Used for government registry validation:

- **Legal Company Name**
  - Official registered name

- **Registration / Incorporation Number**
  - CIN / CRN / EIN

- **Date of Incorporation**
  - Helps verify correct entity

- **Tax ID (GSTIN / VAT / EIN)**
  - Confirms tax registration

---

### B. Digital & Physical Footprint

Validates operational presence:

- **Official Website URL**
  - Used for domain checks

- **Corporate Email Address**
  - Must not allow public domains

- **Registered Office Address**
  - Full address with postal code

- **Operating Address**
  - If different from registered address

---

### C. Responsible Person (KYC)

Ensures the registrant is authorized:

- **Full Name**
  - As per government ID

- **Job Title / Designation**
  - Example: Director, Owner, VP

- **LinkedIn Profile URL (Optional)**
  - Useful for manual verification

---

### D. Document Uploads (Proof)

Required when automated verification fails:

- **Certificate of Incorporation**
  - Proof of company registration

- **Utility Bill / Bank Statement**
  - Address proof (not older than 3 months)

---

## 3. Backend Validation Checklist

| Form Field          | Validation Logic                                                                 |
|--------------------|----------------------------------------------------------------------------------|
| Registration No.   | Query registry API → Status must be "Active"                                     |
| Tax ID            | Query tax authority API → Name must match legal company name                     |
| Website URL       | WHOIS lookup → Domain age should be > 3–6 months                                 |
| Address           | Google Maps API → Must not be categorized as residential                         |
| Email             | DNS check → MX records must exist                                                |
