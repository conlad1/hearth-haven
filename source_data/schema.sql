-- ============================================================
-- Hearth Haven – Azure SQL Server Schema
-- Generated from DataDictionary.md
-- ============================================================

-- Drop tables in reverse dependency order if they exist
IF OBJECT_ID('dbo.public_impact_snapshots', 'U') IS NOT NULL DROP TABLE dbo.public_impact_snapshots;
IF OBJECT_ID('dbo.safehouse_monthly_metrics', 'U') IS NOT NULL DROP TABLE dbo.safehouse_monthly_metrics;
IF OBJECT_ID('dbo.incident_reports', 'U') IS NOT NULL DROP TABLE dbo.incident_reports;
IF OBJECT_ID('dbo.intervention_plans', 'U') IS NOT NULL DROP TABLE dbo.intervention_plans;
IF OBJECT_ID('dbo.health_wellbeing_records', 'U') IS NOT NULL DROP TABLE dbo.health_wellbeing_records;
IF OBJECT_ID('dbo.education_records', 'U') IS NOT NULL DROP TABLE dbo.education_records;
IF OBJECT_ID('dbo.home_visitations', 'U') IS NOT NULL DROP TABLE dbo.home_visitations;
IF OBJECT_ID('dbo.process_recordings', 'U') IS NOT NULL DROP TABLE dbo.process_recordings;
IF OBJECT_ID('dbo.residents', 'U') IS NOT NULL DROP TABLE dbo.residents;
IF OBJECT_ID('dbo.donation_allocations', 'U') IS NOT NULL DROP TABLE dbo.donation_allocations;
IF OBJECT_ID('dbo.in_kind_donation_items', 'U') IS NOT NULL DROP TABLE dbo.in_kind_donation_items;
IF OBJECT_ID('dbo.donations', 'U') IS NOT NULL DROP TABLE dbo.donations;
IF OBJECT_ID('dbo.supporters', 'U') IS NOT NULL DROP TABLE dbo.supporters;
IF OBJECT_ID('dbo.partner_assignments', 'U') IS NOT NULL DROP TABLE dbo.partner_assignments;
IF OBJECT_ID('dbo.partners', 'U') IS NOT NULL DROP TABLE dbo.partners;
IF OBJECT_ID('dbo.social_media_posts', 'U') IS NOT NULL DROP TABLE dbo.social_media_posts;
IF OBJECT_ID('dbo.safehouses', 'U') IS NOT NULL DROP TABLE dbo.safehouses;

-- ============================================================
-- 1. safehouses
-- ============================================================
CREATE TABLE dbo.safehouses (
    safehouse_id        INT             NOT NULL IDENTITY(1,1),
    safehouse_code      NVARCHAR(20)    NOT NULL,
    name                NVARCHAR(200)   NOT NULL,
    region              NVARCHAR(50)    NOT NULL,       -- Luzon | Visayas | Mindanao
    city                NVARCHAR(200)   NOT NULL,
    province            NVARCHAR(200)   NOT NULL,
    country             NVARCHAR(100)   NOT NULL DEFAULT N'Philippines',
    open_date           DATE            NOT NULL,
    status              NVARCHAR(20)    NOT NULL,       -- Active | Inactive
    capacity_girls      INT             NOT NULL,
    capacity_staff      INT             NOT NULL,
    current_occupancy   INT             NOT NULL DEFAULT 0,
    notes               NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_safehouses PRIMARY KEY (safehouse_id),
    CONSTRAINT CK_safehouses_region CHECK (region IN (N'Luzon', N'Visayas', N'Mindanao')),
    CONSTRAINT CK_safehouses_status CHECK (status IN (N'Active', N'Inactive'))
);

-- ============================================================
-- 2. partners
-- ============================================================
CREATE TABLE dbo.partners (
    partner_id      INT             NOT NULL IDENTITY(1,1),
    partner_name    NVARCHAR(300)   NOT NULL,
    partner_type    NVARCHAR(50)    NOT NULL,       -- Organization | Individual
    role_type       NVARCHAR(50)    NOT NULL,       -- Education | Evaluation | SafehouseOps | FindSafehouse | Logistics | Transport | Maintenance
    contact_name    NVARCHAR(200)   NULL,
    email           NVARCHAR(320)   NULL,
    phone           NVARCHAR(50)    NULL,
    region          NVARCHAR(50)    NULL,
    status          NVARCHAR(20)    NOT NULL,       -- Active | Inactive
    start_date      DATE            NOT NULL,
    end_date        DATE            NULL,
    notes           NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_partners PRIMARY KEY (partner_id),
    CONSTRAINT CK_partners_type CHECK (partner_type IN (N'Organization', N'Individual')),
    CONSTRAINT CK_partners_role CHECK (role_type IN (N'Education', N'Evaluation', N'SafehouseOps', N'FindSafehouse', N'Logistics', N'Transport', N'Maintenance')),
    CONSTRAINT CK_partners_status CHECK (status IN (N'Active', N'Inactive'))
);

-- ============================================================
-- 3. partner_assignments
-- ============================================================
CREATE TABLE dbo.partner_assignments (
    assignment_id           INT             NOT NULL IDENTITY(1,1),
    partner_id              INT             NOT NULL,
    safehouse_id            INT             NULL,
    program_area            NVARCHAR(50)    NOT NULL,   -- Education | Wellbeing | Operations | Transport | Maintenance
    assignment_start        DATE            NOT NULL,
    assignment_end          DATE            NULL,
    responsibility_notes    NVARCHAR(MAX)   NULL,
    is_primary              BIT             NOT NULL DEFAULT 0,
    status                  NVARCHAR(20)    NOT NULL,   -- Active | Ended

    CONSTRAINT PK_partner_assignments PRIMARY KEY (assignment_id),
    CONSTRAINT FK_partner_assignments_partner FOREIGN KEY (partner_id) REFERENCES dbo.partners (partner_id),
    CONSTRAINT FK_partner_assignments_safehouse FOREIGN KEY (safehouse_id) REFERENCES dbo.safehouses (safehouse_id),
    CONSTRAINT CK_pa_program_area CHECK (program_area IN (N'Education', N'Wellbeing', N'Operations', N'Transport', N'Maintenance')),
    CONSTRAINT CK_pa_status CHECK (status IN (N'Active', N'Ended'))
);

-- ============================================================
-- 4. supporters
-- ============================================================
CREATE TABLE dbo.supporters (
    supporter_id        INT             NOT NULL IDENTITY(1,1),
    supporter_type      NVARCHAR(50)    NOT NULL,   -- MonetaryDonor | InKindDonor | Volunteer | SkillsContributor | SocialMediaAdvocate | PartnerOrganization
    display_name        NVARCHAR(300)   NOT NULL,
    organization_name   NVARCHAR(300)   NULL,
    first_name          NVARCHAR(100)   NULL,
    last_name           NVARCHAR(100)   NULL,
    relationship_type   NVARCHAR(50)    NOT NULL,   -- Local | International | PartnerOrganization
    region              NVARCHAR(50)    NULL,
    country             NVARCHAR(100)   NULL,
    email               NVARCHAR(320)   NULL,
    phone               NVARCHAR(50)    NULL,
    status              NVARCHAR(20)    NOT NULL,   -- Active | Inactive
    first_donation_date DATE            NULL,
    acquisition_channel NVARCHAR(50)    NULL,       -- Website | SocialMedia | Event | WordOfMouth | PartnerReferral | Church
    created_at          DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_supporters PRIMARY KEY (supporter_id),
    CONSTRAINT CK_supporters_type CHECK (supporter_type IN (N'MonetaryDonor', N'InKindDonor', N'Volunteer', N'SkillsContributor', N'SocialMediaAdvocate', N'PartnerOrganization')),
    CONSTRAINT CK_supporters_rel CHECK (relationship_type IN (N'Local', N'International', N'PartnerOrganization')),
    CONSTRAINT CK_supporters_status CHECK (status IN (N'Active', N'Inactive')),
    CONSTRAINT CK_supporters_channel CHECK (acquisition_channel IS NULL OR acquisition_channel IN (N'Website', N'SocialMedia', N'Event', N'WordOfMouth', N'PartnerReferral', N'Church'))
);

-- ============================================================
-- 5. social_media_posts
-- ============================================================
CREATE TABLE dbo.social_media_posts (
    post_id                         INT             NOT NULL IDENTITY(1,1),
    platform                        NVARCHAR(20)    NOT NULL,   -- Facebook | Instagram | Twitter | TikTok | LinkedIn | YouTube | WhatsApp
    platform_post_id                NVARCHAR(100)   NOT NULL,
    post_url                        NVARCHAR(2048)  NULL,
    created_at                      DATETIME2       NOT NULL,
    day_of_week                     NVARCHAR(10)    NOT NULL,
    post_hour                       INT             NOT NULL,
    post_type                       NVARCHAR(50)    NOT NULL,   -- ImpactStory | Campaign | EventPromotion | ThankYou | EducationalContent | FundraisingAppeal
    media_type                      NVARCHAR(20)    NOT NULL,   -- Photo | Video | Carousel | Text | Reel
    caption                         NVARCHAR(MAX)   NULL,
    hashtags                        NVARCHAR(1000)  NULL,
    num_hashtags                    INT             NOT NULL DEFAULT 0,
    mentions_count                  INT             NOT NULL DEFAULT 0,
    has_call_to_action              BIT             NOT NULL DEFAULT 0,
    call_to_action_type             NVARCHAR(20)    NULL,       -- DonateNow | LearnMore | ShareStory | SignUp
    content_topic                   NVARCHAR(50)    NOT NULL,   -- Education | Health | Reintegration | DonorImpact | SafehouseLife | EventRecap | CampaignLaunch | Gratitude | AwarenessRaising
    sentiment_tone                  NVARCHAR(20)    NOT NULL,   -- Hopeful | Urgent | Celebratory | Informative | Grateful | Emotional
    caption_length                  INT             NOT NULL DEFAULT 0,
    features_resident_story         BIT             NOT NULL DEFAULT 0,
    campaign_name                   NVARCHAR(200)   NULL,
    is_boosted                      BIT             NOT NULL DEFAULT 0,
    boost_budget_php                DECIMAL(12,2)   NULL,
    impressions                     INT             NOT NULL DEFAULT 0,
    reach                           INT             NOT NULL DEFAULT 0,
    likes                           INT             NOT NULL DEFAULT 0,
    comments                        INT             NOT NULL DEFAULT 0,
    shares                          INT             NOT NULL DEFAULT 0,
    saves                           INT             NOT NULL DEFAULT 0,
    click_throughs                  INT             NOT NULL DEFAULT 0,
    video_views                     INT             NULL,
    engagement_rate                 DECIMAL(10,6)   NOT NULL DEFAULT 0,
    profile_visits                  INT             NOT NULL DEFAULT 0,
    donation_referrals              INT             NOT NULL DEFAULT 0,
    estimated_donation_value_php    DECIMAL(12,2)   NOT NULL DEFAULT 0,
    follower_count_at_post          INT             NOT NULL DEFAULT 0,
    watch_time_seconds              INT             NULL,
    avg_view_duration_seconds       INT             NULL,
    subscriber_count_at_post        INT             NULL,
    forwards                        INT             NULL,

    CONSTRAINT PK_social_media_posts PRIMARY KEY (post_id),
    CONSTRAINT CK_smp_platform CHECK (platform IN (N'Facebook', N'Instagram', N'Twitter', N'TikTok', N'LinkedIn', N'YouTube', N'WhatsApp')),
    CONSTRAINT CK_smp_post_type CHECK (post_type IN (N'ImpactStory', N'Campaign', N'EventPromotion', N'ThankYou', N'EducationalContent', N'FundraisingAppeal')),
    CONSTRAINT CK_smp_media_type CHECK (media_type IN (N'Photo', N'Video', N'Carousel', N'Text', N'Reel')),
    CONSTRAINT CK_smp_cta CHECK (call_to_action_type IS NULL OR call_to_action_type IN (N'DonateNow', N'LearnMore', N'ShareStory', N'SignUp')),
    CONSTRAINT CK_smp_topic CHECK (content_topic IN (N'Education', N'Health', N'Reintegration', N'DonorImpact', N'SafehouseLife', N'EventRecap', N'CampaignLaunch', N'Gratitude', N'AwarenessRaising')),
    CONSTRAINT CK_smp_tone CHECK (sentiment_tone IN (N'Hopeful', N'Urgent', N'Celebratory', N'Informative', N'Grateful', N'Emotional')),
    CONSTRAINT CK_smp_hour CHECK (post_hour BETWEEN 0 AND 23)
);

-- ============================================================
-- 6. donations
-- ============================================================
CREATE TABLE dbo.donations (
    donation_id             INT             NOT NULL IDENTITY(1,1),
    supporter_id            INT             NOT NULL,
    donation_type           NVARCHAR(20)    NOT NULL,   -- Monetary | InKind | Time | Skills | SocialMedia
    donation_date           DATE            NOT NULL,
    channel_source          NVARCHAR(30)    NOT NULL,   -- Campaign | Event | Direct | SocialMedia | PartnerReferral
    currency_code           NVARCHAR(10)    NULL,       -- USD for monetary
    amount                  DECIMAL(14,2)   NULL,
    estimated_value         DECIMAL(14,2)   NULL,
    impact_unit             NVARCHAR(20)    NULL,       -- dollars | items | hours | campaigns
    is_recurring            BIT             NOT NULL DEFAULT 0,
    campaign_name           NVARCHAR(200)   NULL,
    notes                   NVARCHAR(MAX)   NULL,
    created_by_partner_id   INT             NULL,
    referral_post_id        INT             NULL,

    CONSTRAINT PK_donations PRIMARY KEY (donation_id),
    CONSTRAINT FK_donations_supporter FOREIGN KEY (supporter_id) REFERENCES dbo.supporters (supporter_id),
    CONSTRAINT FK_donations_partner FOREIGN KEY (created_by_partner_id) REFERENCES dbo.partners (partner_id),
    CONSTRAINT FK_donations_post FOREIGN KEY (referral_post_id) REFERENCES dbo.social_media_posts (post_id),
    CONSTRAINT CK_donations_type CHECK (donation_type IN (N'Monetary', N'InKind', N'Time', N'Skills', N'SocialMedia')),
    CONSTRAINT CK_donations_channel CHECK (channel_source IN (N'Campaign', N'Event', N'Direct', N'SocialMedia', N'PartnerReferral')),
    CONSTRAINT CK_donations_unit CHECK (impact_unit IS NULL OR impact_unit IN (N'dollars', N'items', N'hours', N'campaigns'))
);

-- ============================================================
-- 7. in_kind_donation_items
-- ============================================================
CREATE TABLE dbo.in_kind_donation_items (
    item_id                 INT             NOT NULL IDENTITY(1,1),
    donation_id             INT             NOT NULL,
    item_name               NVARCHAR(300)   NOT NULL,
    item_category           NVARCHAR(30)    NOT NULL,   -- Food | Supplies | Clothing | SchoolMaterials | Hygiene | Furniture | Medical
    quantity                INT             NOT NULL,
    unit_of_measure         NVARCHAR(10)    NOT NULL,   -- pcs | boxes | kg | sets | packs
    estimated_unit_value    DECIMAL(12,2)   NOT NULL,
    intended_use            NVARCHAR(20)    NOT NULL,   -- Meals | Education | Shelter | Hygiene | Health
    received_condition      NVARCHAR(10)    NOT NULL,   -- New | Good | Fair

    CONSTRAINT PK_in_kind_donation_items PRIMARY KEY (item_id),
    CONSTRAINT FK_ikdi_donation FOREIGN KEY (donation_id) REFERENCES dbo.donations (donation_id),
    CONSTRAINT CK_ikdi_category CHECK (item_category IN (N'Food', N'Supplies', N'Clothing', N'SchoolMaterials', N'Hygiene', N'Furniture', N'Medical')),
    CONSTRAINT CK_ikdi_uom CHECK (unit_of_measure IN (N'pcs', N'boxes', N'kg', N'sets', N'packs')),
    CONSTRAINT CK_ikdi_use CHECK (intended_use IN (N'Meals', N'Education', N'Shelter', N'Hygiene', N'Health')),
    CONSTRAINT CK_ikdi_condition CHECK (received_condition IN (N'New', N'Good', N'Fair'))
);

-- ============================================================
-- 8. donation_allocations
-- ============================================================
CREATE TABLE dbo.donation_allocations (
    allocation_id       INT             NOT NULL IDENTITY(1,1),
    donation_id         INT             NOT NULL,
    safehouse_id        INT             NOT NULL,
    program_area        NVARCHAR(50)    NOT NULL,   -- Education | Wellbeing | Operations | Transport | Maintenance | Outreach
    amount_allocated    DECIMAL(14,2)   NOT NULL,
    allocation_date     DATE            NOT NULL,
    allocation_notes    NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_donation_allocations PRIMARY KEY (allocation_id),
    CONSTRAINT FK_da_donation FOREIGN KEY (donation_id) REFERENCES dbo.donations (donation_id),
    CONSTRAINT FK_da_safehouse FOREIGN KEY (safehouse_id) REFERENCES dbo.safehouses (safehouse_id),
    CONSTRAINT CK_da_program_area CHECK (program_area IN (N'Education', N'Wellbeing', N'Operations', N'Transport', N'Maintenance', N'Outreach'))
);

-- ============================================================
-- 9. residents
-- ============================================================
CREATE TABLE dbo.residents (
    resident_id                 INT             NOT NULL IDENTITY(1,1),
    case_control_no             NVARCHAR(20)    NOT NULL,
    internal_code               NVARCHAR(50)    NOT NULL,
    safehouse_id                INT             NOT NULL,
    case_status                 NVARCHAR(20)    NOT NULL,       -- Active | Closed | Transferred
    sex                         NCHAR(1)        NOT NULL DEFAULT N'F',
    date_of_birth               DATE            NOT NULL,
    birth_status                NVARCHAR(20)    NOT NULL,       -- Marital | Non-Marital
    place_of_birth              NVARCHAR(200)   NULL,
    religion                    NVARCHAR(100)   NULL,
    case_category               NVARCHAR(30)    NOT NULL,       -- Abandoned | Foundling | Surrendered | Neglected
    sub_cat_orphaned            BIT             NOT NULL DEFAULT 0,
    sub_cat_trafficked          BIT             NOT NULL DEFAULT 0,
    sub_cat_child_labor         BIT             NOT NULL DEFAULT 0,
    sub_cat_physical_abuse      BIT             NOT NULL DEFAULT 0,
    sub_cat_sexual_abuse        BIT             NOT NULL DEFAULT 0,
    sub_cat_osaec               BIT             NOT NULL DEFAULT 0,
    sub_cat_cicl                BIT             NOT NULL DEFAULT 0,
    sub_cat_at_risk             BIT             NOT NULL DEFAULT 0,
    sub_cat_street_child        BIT             NOT NULL DEFAULT 0,
    sub_cat_child_with_hiv      BIT             NOT NULL DEFAULT 0,
    is_pwd                      BIT             NOT NULL DEFAULT 0,
    pwd_type                    NVARCHAR(100)   NULL,
    has_special_needs           BIT             NOT NULL DEFAULT 0,
    special_needs_diagnosis     NVARCHAR(200)   NULL,
    family_is_4ps               BIT             NOT NULL DEFAULT 0,
    family_solo_parent          BIT             NOT NULL DEFAULT 0,
    family_indigenous           BIT             NOT NULL DEFAULT 0,
    family_parent_pwd           BIT             NOT NULL DEFAULT 0,
    family_informal_settler     BIT             NOT NULL DEFAULT 0,
    date_of_admission           DATE            NOT NULL,
    age_upon_admission          NVARCHAR(50)    NULL,
    present_age                 NVARCHAR(50)    NULL,
    length_of_stay              NVARCHAR(50)    NULL,
    referral_source             NVARCHAR(30)    NOT NULL,       -- Government Agency | NGO | Police | Self-Referral | Community | Court Order
    referring_agency_person     NVARCHAR(300)   NULL,
    date_colb_registered        DATE            NULL,
    date_colb_obtained          DATE            NULL,
    assigned_social_worker      NVARCHAR(300)   NULL,
    initial_case_assessment     NVARCHAR(MAX)   NULL,
    date_case_study_prepared    DATE            NULL,
    reintegration_type          NVARCHAR(50)    NULL,           -- Family Reunification | Foster Care | Adoption (Domestic) | Adoption (Inter-Country) | Independent Living | None
    reintegration_status        NVARCHAR(20)    NULL,           -- Not Started | In Progress | Completed | On Hold
    initial_risk_level          NVARCHAR(10)    NOT NULL,       -- Low | Medium | High | Critical
    current_risk_level          NVARCHAR(10)    NOT NULL,       -- Low | Medium | High | Critical
    date_enrolled               DATE            NOT NULL,
    date_closed                 DATE            NULL,
    created_at                  DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    notes_restricted            NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_residents PRIMARY KEY (resident_id),
    CONSTRAINT FK_residents_safehouse FOREIGN KEY (safehouse_id) REFERENCES dbo.safehouses (safehouse_id),
    CONSTRAINT CK_residents_case_status CHECK (case_status IN (N'Active', N'Closed', N'Transferred')),
    CONSTRAINT CK_residents_birth_status CHECK (birth_status IN (N'Marital', N'Non-Marital')),
    CONSTRAINT CK_residents_category CHECK (case_category IN (N'Abandoned', N'Foundling', N'Surrendered', N'Neglected')),
    CONSTRAINT CK_residents_referral CHECK (referral_source IN (N'Government Agency', N'NGO', N'Police', N'Self-Referral', N'Community', N'Court Order')),
    CONSTRAINT CK_residents_reint_type CHECK (reintegration_type IS NULL OR reintegration_type IN (N'Family Reunification', N'Foster Care', N'Adoption (Domestic)', N'Adoption (Inter-Country)', N'Independent Living', N'None')),
    CONSTRAINT CK_residents_reint_status CHECK (reintegration_status IS NULL OR reintegration_status IN (N'Not Started', N'In Progress', N'Completed', N'On Hold')),
    CONSTRAINT CK_residents_init_risk CHECK (initial_risk_level IN (N'Low', N'Medium', N'High', N'Critical')),
    CONSTRAINT CK_residents_curr_risk CHECK (current_risk_level IN (N'Low', N'Medium', N'High', N'Critical'))
);

-- ============================================================
-- 10. process_recordings
-- ============================================================
CREATE TABLE dbo.process_recordings (
    recording_id                INT             NOT NULL IDENTITY(1,1),
    resident_id                 INT             NOT NULL,
    session_date                DATE            NOT NULL,
    social_worker               NVARCHAR(200)   NOT NULL,
    session_type                NVARCHAR(20)    NOT NULL,       -- Individual | Group
    session_duration_minutes    INT             NOT NULL,
    emotional_state_observed    NVARCHAR(20)    NOT NULL,       -- Calm | Anxious | Sad | Angry | Hopeful | Withdrawn | Happy | Distressed
    emotional_state_end         NVARCHAR(20)    NOT NULL,
    session_narrative           NVARCHAR(MAX)   NULL,
    interventions_applied       NVARCHAR(MAX)   NULL,
    follow_up_actions           NVARCHAR(MAX)   NULL,
    progress_noted              BIT             NOT NULL DEFAULT 0,
    concerns_flagged            BIT             NOT NULL DEFAULT 0,
    referral_made               BIT             NOT NULL DEFAULT 0,
    notes_restricted            NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_process_recordings PRIMARY KEY (recording_id),
    CONSTRAINT FK_pr_resident FOREIGN KEY (resident_id) REFERENCES dbo.residents (resident_id),
    CONSTRAINT CK_pr_session_type CHECK (session_type IN (N'Individual', N'Group')),
    CONSTRAINT CK_pr_emo_obs CHECK (emotional_state_observed IN (N'Calm', N'Anxious', N'Sad', N'Angry', N'Hopeful', N'Withdrawn', N'Happy', N'Distressed')),
    CONSTRAINT CK_pr_emo_end CHECK (emotional_state_end IN (N'Calm', N'Anxious', N'Sad', N'Angry', N'Hopeful', N'Withdrawn', N'Happy', N'Distressed'))
);

-- ============================================================
-- 11. home_visitations
-- ============================================================
CREATE TABLE dbo.home_visitations (
    visitation_id               INT             NOT NULL IDENTITY(1,1),
    resident_id                 INT             NOT NULL,
    visit_date                  DATE            NOT NULL,
    social_worker               NVARCHAR(200)   NOT NULL,
    visit_type                  NVARCHAR(50)    NOT NULL,       -- Initial Assessment | Routine Follow-Up | Reintegration Assessment | Post-Placement Monitoring | Emergency
    location_visited            NVARCHAR(500)   NULL,
    family_members_present      NVARCHAR(500)   NULL,
    purpose                     NVARCHAR(MAX)   NULL,
    observations                NVARCHAR(MAX)   NULL,
    family_cooperation_level    NVARCHAR(30)    NOT NULL,       -- Highly Cooperative | Cooperative | Neutral | Uncooperative
    safety_concerns_noted       BIT             NOT NULL DEFAULT 0,
    follow_up_needed            BIT             NOT NULL DEFAULT 0,
    follow_up_notes             NVARCHAR(MAX)   NULL,
    visit_outcome               NVARCHAR(30)    NOT NULL,       -- Favorable | Needs Improvement | Unfavorable | Inconclusive

    CONSTRAINT PK_home_visitations PRIMARY KEY (visitation_id),
    CONSTRAINT FK_hv_resident FOREIGN KEY (resident_id) REFERENCES dbo.residents (resident_id),
    CONSTRAINT CK_hv_type CHECK (visit_type IN (N'Initial Assessment', N'Routine Follow-Up', N'Reintegration Assessment', N'Post-Placement Monitoring', N'Emergency')),
    CONSTRAINT CK_hv_coop CHECK (family_cooperation_level IN (N'Highly Cooperative', N'Cooperative', N'Neutral', N'Uncooperative')),
    CONSTRAINT CK_hv_outcome CHECK (visit_outcome IN (N'Favorable', N'Needs Improvement', N'Unfavorable', N'Inconclusive'))
);

-- ============================================================
-- 12. education_records
-- ============================================================
CREATE TABLE dbo.education_records (
    education_record_id     INT             NOT NULL IDENTITY(1,1),
    resident_id             INT             NOT NULL,
    record_date             DATE            NOT NULL,
    education_level         NVARCHAR(20)    NOT NULL,   -- Primary | Secondary | Vocational | CollegePrep
    school_name             NVARCHAR(200)   NULL,
    enrollment_status       NVARCHAR(20)    NOT NULL,   -- Enrolled | NotEnrolled
    attendance_rate         DECIMAL(5,4)    NOT NULL,   -- 0.0–1.0
    progress_percent        DECIMAL(5,2)    NOT NULL,   -- 0–100
    completion_status       NVARCHAR(20)    NOT NULL,   -- NotStarted | InProgress | Completed
    notes                   NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_education_records PRIMARY KEY (education_record_id),
    CONSTRAINT FK_er_resident FOREIGN KEY (resident_id) REFERENCES dbo.residents (resident_id),
    CONSTRAINT CK_er_level CHECK (education_level IN (N'Primary', N'Secondary', N'Vocational', N'CollegePrep')),
    CONSTRAINT CK_er_completion CHECK (completion_status IN (N'NotStarted', N'InProgress', N'Completed'))
);

-- ============================================================
-- 13. health_wellbeing_records
-- ============================================================
CREATE TABLE dbo.health_wellbeing_records (
    health_record_id            INT             NOT NULL IDENTITY(1,1),
    resident_id                 INT             NOT NULL,
    record_date                 DATE            NOT NULL,
    general_health_score        DECIMAL(3,1)    NULL,       -- 1.0–5.0
    nutrition_score             DECIMAL(3,1)    NULL,       -- 1.0–5.0
    sleep_quality_score         DECIMAL(3,1)    NULL,       -- 1.0–5.0
    energy_level_score          DECIMAL(3,1)    NULL,       -- 1.0–5.0
    height_cm                   DECIMAL(5,1)    NULL,
    weight_kg                   DECIMAL(5,2)    NULL,
    bmi                         DECIMAL(5,2)    NULL,
    medical_checkup_done        BIT             NOT NULL DEFAULT 0,
    dental_checkup_done         BIT             NOT NULL DEFAULT 0,
    psychological_checkup_done  BIT             NOT NULL DEFAULT 0,
    notes                       NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_health_wellbeing_records PRIMARY KEY (health_record_id),
    CONSTRAINT FK_hwr_resident FOREIGN KEY (resident_id) REFERENCES dbo.residents (resident_id)
);

-- ============================================================
-- 14. intervention_plans
-- ============================================================
CREATE TABLE dbo.intervention_plans (
    plan_id                 INT             NOT NULL IDENTITY(1,1),
    resident_id             INT             NOT NULL,
    plan_category           NVARCHAR(30)    NOT NULL,   -- Safety | Psychosocial | Education | Physical Health | Legal | Reintegration
    plan_description        NVARCHAR(MAX)   NOT NULL,
    services_provided       NVARCHAR(MAX)   NULL,
    target_value            DECIMAL(10,2)   NULL,
    target_date             DATE            NOT NULL,
    status                  NVARCHAR(20)    NOT NULL,   -- Open | In Progress | Achieved | On Hold | Closed
    case_conference_date    DATE            NULL,
    created_at              DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_intervention_plans PRIMARY KEY (plan_id),
    CONSTRAINT FK_ip_resident FOREIGN KEY (resident_id) REFERENCES dbo.residents (resident_id),
    CONSTRAINT CK_ip_category CHECK (plan_category IN (N'Safety', N'Physical Health', N'Education')),
    CONSTRAINT CK_ip_status CHECK (status IN (N'Open', N'In Progress', N'Achieved', N'On Hold', N'Closed'))
);

-- ============================================================
-- 15. incident_reports
-- ============================================================
CREATE TABLE dbo.incident_reports (
    incident_id         INT             NOT NULL IDENTITY(1,1),
    resident_id         INT             NOT NULL,
    safehouse_id        INT             NOT NULL,
    incident_date       DATE            NOT NULL,
    incident_type       NVARCHAR(30)    NOT NULL,   -- Behavioral | Medical | Security | RunawayAttempt | SelfHarm | ConflictWithPeer | PropertyDamage
    severity            NVARCHAR(10)    NOT NULL,   -- Low | Medium | High
    description         NVARCHAR(MAX)   NULL,
    response_taken      NVARCHAR(MAX)   NULL,
    resolved            BIT             NOT NULL DEFAULT 0,
    resolution_date     DATE            NULL,
    reported_by         NVARCHAR(200)   NOT NULL,
    follow_up_required  BIT             NOT NULL DEFAULT 0,

    CONSTRAINT PK_incident_reports PRIMARY KEY (incident_id),
    CONSTRAINT FK_ir_resident FOREIGN KEY (resident_id) REFERENCES dbo.residents (resident_id),
    CONSTRAINT FK_ir_safehouse FOREIGN KEY (safehouse_id) REFERENCES dbo.safehouses (safehouse_id),
    CONSTRAINT CK_ir_type CHECK (incident_type IN (N'Behavioral', N'Medical', N'Security', N'RunawayAttempt', N'SelfHarm', N'ConflictWithPeer', N'PropertyDamage')),
    CONSTRAINT CK_ir_severity CHECK (severity IN (N'Low', N'Medium', N'High'))
);

-- ============================================================
-- 16. safehouse_monthly_metrics
-- ============================================================
CREATE TABLE dbo.safehouse_monthly_metrics (
    metric_id                   INT             NOT NULL IDENTITY(1,1),
    safehouse_id                INT             NOT NULL,
    month_start                 DATE            NOT NULL,
    month_end                   DATE            NOT NULL,
    active_residents            INT             NOT NULL DEFAULT 0,
    avg_education_progress      DECIMAL(5,2)    NULL,       -- 0–100
    avg_health_score            DECIMAL(3,1)    NULL,       -- 1.0–5.0
    process_recording_count     INT             NOT NULL DEFAULT 0,
    home_visitation_count       INT             NOT NULL DEFAULT 0,
    incident_count              INT             NOT NULL DEFAULT 0,
    notes                       NVARCHAR(MAX)   NULL,

    CONSTRAINT PK_safehouse_monthly_metrics PRIMARY KEY (metric_id),
    CONSTRAINT FK_smm_safehouse FOREIGN KEY (safehouse_id) REFERENCES dbo.safehouses (safehouse_id),
    CONSTRAINT UQ_smm_safehouse_month UNIQUE (safehouse_id, month_start)
);

-- ============================================================
-- 17. public_impact_snapshots
-- ============================================================
CREATE TABLE dbo.public_impact_snapshots (
    snapshot_id             INT             NOT NULL IDENTITY(1,1),
    snapshot_date           DATE            NOT NULL,
    headline                NVARCHAR(500)   NOT NULL,
    summary_text            NVARCHAR(MAX)   NULL,
    metric_payload_json     NVARCHAR(MAX)   NULL,
    is_published            BIT             NOT NULL DEFAULT 0,
    published_at            DATE            NULL,

    CONSTRAINT PK_public_impact_snapshots PRIMARY KEY (snapshot_id)
);

-- ============================================================
-- End of schema
-- ============================================================
