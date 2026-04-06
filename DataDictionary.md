# Appendix A: Data Dictionary

## Table Overview
| Table | Detail | Purpose |
| :--- | :--- | :--- |
| **safehouses** | One row per safehouse | [cite_start]Physical locations where girls are housed and served[cite: 456]. |
| **partners** | One row per partner | [cite_start]Organizations and individuals who deliver services[cite: 456]. |
| **partner_assignments** | One row per partner × safehouse × program area | [cite_start]Which partners serve which safehouses and in what capacity[cite: 456]. |
| **supporters** | One row per donor/supporter | [cite_start]People and organizations who donate money, goods, time, skills, or advocacy[cite: 456]. |
| **donations** | One row per donation event | [cite_start]Individual donations across all types[cite: 456]. |
| **in_kind_donation_items** | One row per line item | [cite_start]Item-level details for in-kind donations[cite: 456]. |
| **donation_allocations** | One row per donation × safehouse × program area | [cite_start]How donation value is distributed across safehouses and program areas[cite: 456]. |
| **residents** | One row per resident | [cite_start]Case records for girls currently or formerly served[cite: 456]. |
| **process_recordings** | One row per counseling session | [cite_start]Dated counseling session notes for each resident[cite: 456]. |
| **home_visitations** | One row per home/field visit | [cite_start]Home and field visit records for residents and families[cite: 456]. |
| **education_records** | One row per resident per month | [cite_start]Monthly education progress and attendance[cite: 456]. |
| **health_wellbeing_records** | One row per resident per month | [cite_start]Monthly physical health, nutrition, sleep, and energy[cite: 456]. |
| **intervention_plans** | One row per intervention/goal | [cite_start]Individual intervention plans, goals, and services[cite: 456]. |
| **incident_reports** | One row per incident | [cite_start]Individual safety and behavioral incident records[cite: 456]. |
| **social_media_posts** | One row per social media post | [cite_start]Organization social media activity, content, and engagement metrics (API-like schema)[cite: 458]. |
| **safehouse_monthly_metrics** | One row per safehouse per month | [cite_start]Aggregated monthly outcome metrics for each safehouse[cite: 458]. |
| **public_impact_snapshots** | One row per month | [cite_start]Anonymized aggregate impact reports for public/donor communication[cite: 458]. |


## safehouses
Safehouse locations operated by the organization.

| Field | Type | Description |
| :--- | :--- | :--- |
| **safehouse_id** | integer | Primary key |
| **safehouse_code** | string | Human-readable short code (e.g., SH-01) |
| **name** | string | Display name |
| **region** | string | One of: Luzon, Visayas, Mindanao |
| **city** | string | City of the safehouse |
| **province** | string | Province of the safehouse |
| **country** | string | Always Philippines |
| **open_date** | date | Date the safehouse opened |
| **status** | string | Active or Inactive |
| **capacity_girls** | integer | Maximum number of girls the facility can house |
| **capacity_staff** | integer | Target on-site staff headcount |
| **current_occupancy** | integer | Current number of girls housed |
| **notes** | string | Free-text notes |

## partners
Organizations and individuals contracted to deliver services (education, operations, transport, etc.).

| Field | Type | Description |
| :--- | :--- | :--- |
| **partner_id** | integer | Primary key |
| **partner_name** | string | Full name or organization name |
| **partner_type** | string | Organization or Individual |
| **role_type** | string | One of: Education, Evaluation, SafehouseOps, FindSafehouse, Logistics, Transport, Maintenance |
| **contact_name** | string | Primary contact person |
| **email** | string | Contact email address |
| **phone** | string | Contact phone number |
| **region** | string | Primary region served |
| **status** | string | Active or Inactive |
| **start_date** | date | Contract start date |
| **end_date** | date | Contract end date; null if still active |
| **notes** | string | Free-text notes |

## partner_assignments
Assignments of partners to safehouses and program areas.

| Field | Type | Description |
| :--- | :--- | :--- |
| **assignment_id** | integer | Primary key |
| **partner_id** | integer | FK → partners.partner_id |
| **safehouse_id** | integer | FK → safehouses.safehouse_id (nullable) |
| **program_area** | string | One of: Education, Wellbeing, Operations, Transport, Maintenance |
| **assignment_start** | date | Assignment start date |
| **assignment_end** | date | Assignment end date; null if active |
| **responsibility_notes** | string | Description of the assignment |
| **is_primary** | boolean | Whether this is the partner’s primary assignment |
| **status** | string | Active or Ended |

## supporters
Donors, volunteers, skilled contributors, and partner organizations that provide support.

| Field | Type | Description |
| :--- | :--- | :--- |
| **supporter_id** | integer | Primary key |
| **supporter_type** | string | One of: MonetaryDonor, InKindDonor, Volunteer, SkillsContributor, SocialMediaAdvocate, PartnerOrganization |
| **display_name** | string | Name shown in communications |
| **organization_name** | string | Organization name (null for individuals) |
| **first_name** | string | First name (null for organizations) |
| **last_name** | string | Last name (null for organizations) |
| **relationship_type** | string | One of: Local, International, PartnerOrganization |
| **region** | string | Region of record |
| **country** | string | Country of the supporter |
| **email** | string | Contact email address |
| **phone** | string | Contact phone number |
| **status** | string | Active or Inactive |
| **first_donation_date** | date | Date of the supporter’s first donation (nullable) |
| **acquisition_channel** | string | How the supporter first learned about the organization. One of: Website, SocialMedia, Event, WordOfMouth, PartnerReferral, Church |
| **created_at** | datetime | When the supporter record was created |

## donations
Donation events across all donation types.

| Field | Type | Description |
| :--- | :--- | :--- |
| **donation_id** | integer | Primary key |
| **supporter_id** | integer | FK → supporters.supporter_id |
| **donation_type** | string | One of: Monetary, InKind, Time, Skills, SocialMedia |
| **donation_date** | date | Date of the donation |
| **channel_source** | string | One of: Campaign, Event, Direct, SocialMedia, PartnerReferral |
| **currency_code** | string | PHP for monetary (in Philippine pesos); null otherwise |
| **amount** | decimal | Monetary amount; null for non-monetary |
| **estimated_value** | decimal | Value in the unit given by impact_unit |
| **impact_unit** | string | One of: pesos, items, hours, campaigns |
| **is_recurring** | boolean | Whether this donation is part of a recurring commitment |
| **campaign_name** | string | Name of the fundraising campaign, if applicable (nullable). Examples: Year-End Hope, Back to School, Summer of Safety, GivingTuesday |
| **notes** | string | Free-text notes |
| **created_by_partner_id** | integer | FK → partners.partner_id (nullable) |
| **referral_post_id** | integer | FK → social_media_posts.post_id (nullable). Populated for donations where channel_source is SocialMedia, linking to the post that likely referred the donation |

## in_kind_donation_items
Line-item details for in-kind donations.

| Field | Type | Description |
| :--- | :--- | :--- |
| **item_id** | integer | Primary key |
| **donation_id** | integer | FK → donations.donation_id |
| **item_name** | string | Item description |
| **item_category** | string | One of: Food, Supplies, Clothing, SchoolMaterials, Hygiene, Furniture, Medical |
| **quantity** | integer | Quantity donated |
| **unit_of_measure** | string | One of: pcs, boxes, kg, sets, packs |
| **estimated_unit_value** | decimal | Estimated value per unit in Philippine pesos (PHP) |
| **intended_use** | string | One of: Meals, Education, Shelter, Hygiene, Health |
| **received_condition** | string | One of: New, Good, Fair |

## donation_allocations
How donations are allocated across safehouses and program areas.

| Field | Type | Description |
| :--- | :--- | :--- |
| **allocation_id** | integer | Primary key |
| **donation_id** | integer | FK → donations.donation_id |
| **safehouse_id** | integer | FK → safehouses.safehouse_id |
| **program_area** | string | One of: Education, Wellbeing, Operations, Transport, Maintenance, Outreach |
| **amount_allocated** | decimal | Allocated value in Philippine pesos (PHP) |
| **allocation_date** | date | Date of allocation |
| **allocation_notes** | string | Free-text notes |

## residents
Case records for girls currently or formerly served by the organization. This table is modeled after real caseload inventory documentation used by Philippine social welfare agencies.

| Field | Type | Description |
| :--- | :--- | :--- |
| **resident_id** | integer | Primary key |
| **case_control_no** | string | Case control number (e.g., C0073) |
| **internal_code** | string | Anonymized internal identifier |
| **safehouse_id** | integer | FK → safehouses.safehouse_id |
| **case_status** | string | One of: Active, Closed, Transferred |
| **sex** | string | F (all residents in this program are female) |
| **date_of_birth** | date | Date of birth |
| **birth_status** | string | One of: Marital, Non-Marital |
| **place_of_birth** | string | City/municipality of birth |
| **religion** | string | Religious affiliation |
| **case_category** | string | One of: Abandoned, Foundling, Surrendered, Neglected |
| **sub_cat_orphaned** | boolean | Is the child orphaned? |
| **sub_cat_trafficked** | boolean | Is the child a trafficked child? |
| **sub_cat_child_labor** | boolean | Is the child a victim of child labor? |
| **sub_cat_physical_abuse** | boolean | Is the child a victim of physical abuse? |
| **sub_cat_sexual_abuse** | boolean | Is the child a victim of sexual abuse? |
| **sub_cat_osaec** | boolean | Is the child a victim of OSAEC/CSAEM? |
| **sub_cat_cicl** | boolean | Is the child in conflict with the law (CICL)? |
| **sub_cat_at_risk** | boolean | Is the child at risk (CAR)? |
| **sub_cat_street_child** | boolean | Is the child in a street situation? |
| **sub_cat_child_with_hiv** | boolean | Is the child living with HIV? |
| **is_pwd** | boolean | Is the child a person with a disability? |
| **pwd_type** | string | Type of disability if applicable (nullable) |
| **has_special_needs** | boolean | Does the child have mental/health/developmental needs? |
| **special_needs_diagnosis** | string | Diagnosis/type if applicable (nullable) |
| **family_is_4ps** | boolean | Is the family a 4Ps (Pantawid Pamilyang Pilipino Program) beneficiary? |
| **family_solo_parent** | boolean | Is the parent a solo parent? |
| **family_indigenous** | boolean | Is the family part of an indigenous group? |
| **family_parent_pwd** | boolean | Is the parent a person with a disability? |
| **family_informal_settler** | boolean | Is the family an informal settler or homeless? |
| **date_of_admission** | date | Date admitted to the safehouse |
| **age_upon_admission** | string | Age at admission (e.g., 13 Years 2 months), current data may not be calculated accurately. |
| **present_age** | string | Current age as of reporting date, current data may not be calculated accurately |
| **length_of_stay** | string | Duration in the center (e.g., 3 Years 1 months), current data may not be calculated accurately |
| **referral_source** | string | One of: Government Agency, NGO, Police, Self-Referral, Community, Court Order |
| **referring_agency_person** | string | Name of referring agency or person |
| **date_colb_registered** | date | Date Certificate of Live Birth (COLB) was registered (nullable) |
| **date_colb_obtained** | date | Date Certificate of Live Birth (COLB) was obtained from Local Civil Registry (LCR) or Philippine Statistics Authority (PSA) (nullable) |
| **assigned_social_worker** | string | Name(s) of assigned social worker(s) |
| **initial_case_assessment** | string | Initial assessment/plan (e.g., For Reunification, For Foster Care) |
| **date_case_study_prepared** | date | Date the child case study report was prepared (nullable) |
| **reintegration_type** | string | One of: Family Reunification, Foster Care, Adoption (Domestic), Adoption (Inter-Country), Independent Living, None (nullable) |
| **reintegration_status** | string | One of: Not Started, In Progress, Completed, On Hold (nullable) |
| **initial_risk_level** | string | Risk level assessed at intake. One of: Low, Medium, High, Critical |
| **current_risk_level** | string | Most recently assessed risk level. One of: Low, Medium, High, Critical |
| **date_enrolled** | date | Same as date_of_admission (for compatibility) |
| **date_closed** | date | Date the case was closed; null if still open |
| **created_at** | datetime | Record creation timestamp |
| **notes_restricted** | string | Restricted-access free-text field |

## process_recordings
Structured counseling session notes for each resident, following the “Process Recording” format used by Philippine social welfare practitioners. Each entry documents a dated interaction between a social worker and a resident, including observations, interventions, and follow-up actions.

| Field | Type | Description |
| :--- | :--- | :--- |
| **recording_id** | integer | Primary key |
| **resident_id** | integer | FK → residents.resident_id |
| **session_date** | date | Date of the counseling session |
| **social_worker** | string | Name of the social worker conducting the session |
| **session_type** | string | One of: Individual, Group |
| **session_duration_minutes** | integer | Duration of the session in minutes |
| **emotional_state_observed** | string | Emotional state at the start of the session. One of: Calm, Anxious, Sad, Angry, Hopeful, Withdrawn, Happy, Distressed |
| **emotional_state_end** | string | Emotional state at the end of the session. Same enum as emotional_state_observed |
| **session_narrative** | string | Narrative summary of the session (what was discussed, what was observed) |
| **interventions_applied** | string | Description of interventions or techniques used |
| **follow_up_actions** | string | Planned follow-up actions |
| **progress_noted** | boolean | Whether progress was noted in this session |
| **concerns_flagged** | boolean | Whether any concerns were flagged |
| **referral_made** | boolean | Whether a referral was made to another professional (e.g., psychologist, legal) |
| **notes_restricted** | string | Restricted-access free-text field |

## home_visitations
Records of home and field visits conducted by social workers to the families or guardians of residents. Home visitations are a critical part of case assessment, reintegration planning, and post-placement monitoring.

| Field | Type | Description |
| :--- | :--- | :--- |
| **visitation_id** | integer | Primary key |
| **resident_id** | integer | FK → residents.resident_id |
| **visit_date** | date | Date of the visit |
| **social_worker** | string | Name of the social worker who conducted the visit |
| **visit_type** | string | One of: Initial Assessment, Routine Follow-Up, Reintegration Assessment, Post-Placement Monitoring, Emergency |
| **location_visited** | string | Location or address visited |
| **family_members_present** | string | Description of who was present (e.g., “Mother and aunt”) |
| **purpose** | string | Purpose of the visit |
| **observations** | string | Narrative observations about the home environment and family |
| **family_cooperation_level** | string | One of: Highly Cooperative, Cooperative, Neutral, Uncooperative |
| **safety_concerns_noted** | boolean | Whether safety concerns were noted during the visit |
| **follow_up_needed** | boolean | Whether follow-up action is needed |
| **follow_up_notes** | string | Details of required follow-up (nullable) |
| **visit_outcome** | string | One of: Favorable, Needs Improvement, Unfavorable, Inconclusive |

## education_records
Monthly education progress records for each resident, tracking enrollment in educational programs, attendance, and academic progress.

| Field | Type | Description |
| :--- | :--- | :--- |
| **education_record_id** | integer | Primary key |
| **resident_id** | integer | FK → residents.resident_id |
| **record_date** | date | Date of the record |
| **education_level** | string | One of: Primary, Secondary, Vocational, CollegePrep |
| **school_name** | string | Name of the school |
| **enrollment_status** | string | One of: Enrolled, NotEnrolled |
| **attendance_rate** | decimal | Rolling attendance rate (0.0–1.0) |
| **progress_percent** | decimal | Overall program progress (0–100) |
| **completion_status** | string | One of: NotStarted, InProgress, Completed |
| **notes** | string | Free-text notes |

## health_wellbeing_records
Monthly physical health and wellbeing records for each resident, including medical, dental, and nutritional assessments.

| Field | Type | Description |
| :--- | :--- | :--- |
| **health_record_id** | integer | Primary key |
| **resident_id** | integer | FK → residents.resident_id |
| **record_date** | date | Date of the record |
| **general_health_score** | decimal | Overall health score (1.0–5.0) |
| **nutrition_score** | decimal | Nutrition quality score (1.0–5.0) |
| **sleep_quality_score** | decimal | Sleep quality score (1.0–5.0) |
| **energy_level_score** | decimal | Daytime energy score (1.0–5.0) |
| **height_cm** | decimal | Height in centimeters |
| **weight_kg** | decimal | Body weight in kilograms |
| **bmi** | decimal | Body mass index |
| **medical_checkup_done** | boolean | Whether a medical check-up was conducted this period |
| **dental_checkup_done** | boolean | Whether a dental check-up was conducted this period |
| **psychological_checkup_done** | boolean | Whether a psychological check-up was conducted this period |
| **notes** | string | Free-text notes |

## intervention_plans
Individual intervention plans, goals, and services provided to each resident. Each plan represents a structured goal with a target area, description, and progress tracking. Plans are created during case conferences and updated during process recording sessions.

| Field | Type | Description |
| :--- | :--- | :--- |
| **plan_id** | integer | Primary key |
| **resident_id** | integer | FK → residents.resident_id |
| **plan_category** | string | One of: Safety, Psychosocial, Education, Physical Health, Legal, Reintegration |
| **plan_description** | string | Description of the intervention or goal |
| **services_provided** | string | Services provided (e.g., Caring, Healing, Teaching, Legal Services) |
| **target_value** | decimal | Numeric target for the goal on the relevant scale (nullable) |
| **target_date** | date | Target date for achievement |
| **status** | string | One of: Open, In Progress, Achieved, On Hold, Closed |
| **case_conference_date** | date | Date of the case conference where this plan was created/reviewed (nullable) |
| **created_at** | datetime | Record creation timestamp |
| **updated_at** | datetime | Last update timestamp |

## incident_reports
Individual safety and behavioral incident records for residents. Each row represents a specific incident that was observed, reported, or documented by staff. Incident data provides granular detail beyond the monthly aggregate counts in safehouse_monthly_metrics.

| Field | Type | Description |
| :--- | :--- | :--- |
| **incident_id** | integer | Primary key |
| **resident_id** | integer | FK → residents.resident_id |
| **safehouse_id** | integer | FK → safehouses.safehouse_id |
| **incident_date** | date | Date of the incident |
| **incident_type** | string | One of: Behavioral, Medical, Security, RunawayAttempt, SelfHarm, ConflictWithPeer, PropertyDamage |
| **severity** | string | One of: Low, Medium, High |
| **description** | string | Narrative description of the incident |
| **response_taken** | string | Description of the staff response |
| **resolved** | boolean | Whether the incident has been resolved |
| **resolution_date** | date | Date the incident was resolved (nullable) |
| **reported_by** | string | Name of the staff member who reported the incident |
| **follow_up_required** | boolean | Whether follow-up action is required |

## social_media_posts
Records of the organization’s social media activity across platforms, modeled after the data available through platform APIs (Twitter/X, Facebook Graph, Instagram Insights, TikTok, LinkedIn, YouTube Data, WhatsApp Channels). Each row represents a single post with its content, metadata, and engagement metrics. Used to analyze social media effectiveness and its relationship to donor behavior.

| Field | Type | Description |
| :--- | :--- | :--- |
| **post_id** | integer | Primary key |
| **platform** | string | One of: Facebook, Instagram, Twitter, TikTok, LinkedIn, YouTube, WhatsApp |
| **platform_post_id** | string | Simulated platform-native post ID (e.g., fb_1234567890123456) |
| **post_url** | string | Permalink URL to the post |
| **created_at** | datetime | Full date and time the post was published (includes hour and minute) |
| **day_of_week** | string | Day of the week (e.g., Monday, Tuesday) |
| **post_hour** | integer | Hour of the day the post was published (0–23) |
| **post_type** | string | One of: ImpactStory, Campaign, EventPromotion, ThankYou, EducationalContent, FundraisingAppeal |
| **media_type** | string | One of: Photo, Video, Carousel, Text, Reel |
| **caption** | string | Full text caption of the post |
| **hashtags** | string | Comma-separated list of hashtags used (e.g., #EndTrafficking, #HopeForGirls) |
| **num_hashtags** | integer | Count of hashtags used |
| **mentions_count** | integer | Number of @mentions in the post |
| **has_call_to_action** | boolean | Whether the post includes a call to action |
| **call_to_action_type** | string | One of: DonateNow, LearnMore, ShareStory, SignUp (nullable) |
| **content_topic** | string | One of: Education, Health, Reintegration, DonorImpact, SafehouseLife, EventRecap, CampaignLaunch, Gratitude, AwarenessRaising |
| **sentiment_tone** | string | One of: Hopeful, Urgent, Celebratory, Informative, Grateful, Emotional |
| **caption_length** | integer | Character count of the caption |
| **features_resident_story** | boolean | Whether the post features a specific resident’s anonymized story |
| **campaign_name** | string | Associated campaign name, if any (nullable). Uses the same campaign names as donations.campaign_name |
| **is_boosted** | boolean | Whether paid promotion was used for this post |
| **boost_budget_php** | decimal | Amount spent on paid promotion in Philippine pesos (PHP) (nullable; only populated if is_boosted is true) |
| **impressions** | integer | Total number of times the post was displayed |
| **reach** | integer | Number of unique accounts that saw the post |
| **likes** | integer | Number of likes or reactions |
| **comments** | integer | Number of comments |
| **shares** | integer | Number of shares or retweets |
| **saves** | integer | Number of saves or bookmarks |
| **click_throughs** | integer | Number of clicks to the organization’s website |
| **video_views** | integer | Number of video views (nullable; only populated for Video and Reel media types) |
| **engagement_rate** | decimal | Engagement rate: (likes + comments + shares) / reach |
| **profile_visits** | integer | Number of profile visits attributed to this post |
| **donation_referrals** | integer | Number of donations attributed to this post |
| **estimated_donation_value_php** | decimal | Estimated total Philippine pesos (PHP) value of donations referred by this post |
| **follower_count_at_post** | integer | Organization’s follower count on this platform at the time of posting |
| **watch_time_seconds** | integer | Total watch time in seconds across all viewers (nullable; only populated for YouTube posts) |
| **avg_view_duration_seconds** | integer | Average number of seconds each viewer watched (nullable; only populated for YouTube posts) |
| **subscriber_count_at_post** | integer | YouTube subscriber count at the time of posting (nullable; only populated for YouTube posts) |
| **forwards** | integer | Number of message forwards (nullable; only populated for WhatsApp posts). WhatsApp forwards represent personal referrals with high donation conversion rates |

## safehouse_monthly_metrics
Pre-aggregated monthly metrics for each safehouse.

| Field | Type | Description |
| :--- | :--- | :--- |
| **metric_id** | integer | Primary key |
| **safehouse_id** | integer | FK → safehouses.safehouse_id |
| **month_start** | date | First day of the month |
| **month_end** | date | Last day of the month |
| **active_residents** | integer | Number of residents assigned during the month |
| **avg_education_progress** | decimal | Mean education progress (0–100) |
| **avg_health_score** | decimal | Mean general health score (1.0–5.0) |
| **process_recording_count** | integer | Total process recording entries for the month |
| **home_visitation_count** | integer | Total home visitations conducted |
| **incident_count** | integer | Total safety incidents recorded (from incident_reports) |
| **notes** | string | Free-text notes |

public_impact_snapshots
Monthly anonymized aggregate impact reports intended for public-facing dashboards and donor communications.

| Field | Type | Description |
| :--- | :--- | :--- |
| **snapshot_id** | integer | Primary key |
| **snapshot_date** | date | Month the snapshot represents |
| **headline** | string | Headline text for the snapshot |
| **summary_text** | string | Short paragraph summary |
| **metric_payload_json** | string | JSON string of aggregated metrics |
| **is_published** | boolean | Whether the snapshot has been published |
| **published_at** | date | Publication date |
