# [1.5.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.4.0...v1.5.0) (2026-06-11)


### Features

* add EventTask model and GENERATE_TASKLIST JobType enum for automated pitch tasklist ([56c114e](https://github.com/AnirudhAP2k/CorpConnect/commit/56c114e6723dcd206cc3a9901a9339c86f3afde8))
* add generateEventTasklist method and AIEventTasklist types to aiService client ([51b50a7](https://github.com/AnirudhAP2k/CorpConnect/commit/51b50a75049e8c9ad86eefdca1b1889bedd31cc8))
* add pitch tasks page with AI-generated milestone checklist UI grouped by lifecycle phase ([768c053](https://github.com/AnirudhAP2k/CorpConnect/commit/768c053a3dd0104574a21d9739403732cc9a1e2f))
* add POST /chat/brainstorm/tasklist endpoint with LLM + deterministic fallback ([0d8b864](https://github.com/AnirudhAP2k/CorpConnect/commit/0d8b864e6d44a136e00c8c72ab2e2e9f67e59427))
* add tasklist-generator job handler with idempotency and AI service integration ([a4d909f](https://github.com/AnirudhAP2k/CorpConnect/commit/a4d909f6657905584bd34d5d75c9ede18c7f9237))
* enqueue GENERATE_TASKLIST job on pitch approval in reviewPitchAction ([a74d6e0](https://github.com/AnirudhAP2k/CorpConnect/commit/a74d6e0d48bf291de0e76cc9a4f71bee0eddb041))
* mark Phase 15 complete in task tracker ([9be2de2](https://github.com/AnirudhAP2k/CorpConnect/commit/9be2de2f6649f00527e07dc182eaf2a9b70909be))
* mark Phase 16 Automated Event Tasklist complete in task tracker ([31e175b](https://github.com/AnirudhAP2k/CorpConnect/commit/31e175b834b840ad745d59bdbc46313c17b94a0d))
* update billing plan features with enterprise capabilities and NEW badges ([eece862](https://github.com/AnirudhAP2k/CorpConnect/commit/eece862f45fa5809087b2fa636cba3077f554054))
* wire GENERATE_TASKLIST job type into processJob switch in job-processor ([508d8c4](https://github.com/AnirudhAP2k/CorpConnect/commit/508d8c4a9c6bd7053b5ad9c62289820dac0490aa))

# [1.4.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.3.0...v1.4.0) (2026-06-10)


### Bug Fixes

* make children prop optional in EnterpriseGate for standalone paywall usage ([42244dd](https://github.com/AnirudhAP2k/CorpConnect/commit/42244dd1a8133866e2609aa9787412c7a515317d))
* mark Phase 13 notifications and all Phase 14 deliverables as complete in task tracker ([8369ded](https://github.com/AnirudhAP2k/CorpConnect/commit/8369ded2130eaba56757f0c36f9ee6cbf539a8a2))
* minor whitespace fixes in schema.prisma ([4636aae](https://github.com/AnirudhAP2k/CorpConnect/commit/4636aaee0f0602cc3b58ff302557aee1fcbf9be7))


### Features

* add EnterpriseGate client component with full paywall and blur overlay variants ([b55264d](https://github.com/AnirudhAP2k/CorpConnect/commit/b55264d94762d344b51417caa767b6a92f75f36a))
* add generateEventSummary method and AI event summary types to AI service client ([c6e03ec](https://github.com/AnirudhAP2k/CorpConnect/commit/c6e03ec3d3ea264c7be06962eb85f75f1c6de0f5))
* add HTML email template for post-event analytics report ([8e17866](https://github.com/AnirudhAP2k/CorpConnect/commit/8e178662eb85296dc79b887173a80a20f8c9c325))
* add idempotent scheduleEventReport job enqueuer for post-event report ([380f2c4](https://github.com/AnirudhAP2k/CorpConnect/commit/380f2c4e5a9597c6543e6c509f24bf5dcdc1be7b))
* add POST /analyse/event-summary endpoint for AI executive report generation ([4ffd41f](https://github.com/AnirudhAP2k/CorpConnect/commit/4ffd41ff22d20e709b216d894a0f1ee5f3972ba4))
* add post-event analytics report page with enterprise gate and AI summary ([90f85fb](https://github.com/AnirudhAP2k/CorpConnect/commit/90f85fbcda2d2d937e5e54450b0ff1ad5768b142))
* add requireEnterprise server-side utility with isEnterpriseOrg and checkEnterprise helpers ([6217b9c](https://github.com/AnirudhAP2k/CorpConnect/commit/6217b9c768b9f46da837871ccd8a594a19b72c98))
* add triggerScheduleEventReport manual trigger to cron-jobs ([d666903](https://github.com/AnirudhAP2k/CorpConnect/commit/d6669035ae387f3a82b99925e0edaee6a328f49e))
* implement processEventReport job handler with metrics aggregation and email delivery ([0300d89](https://github.com/AnirudhAP2k/CorpConnect/commit/0300d89ef8ebc810adc458e152ee2382b347cbbf))
* schedule post-event report job from createEventAction and updateEventAction ([c7f9c12](https://github.com/AnirudhAP2k/CorpConnect/commit/c7f9c124317307883d5112133cd2ca59380eb168))
* wire GENERATE_REPORT case in job processor to call processEventReport ([cc2f7d7](https://github.com/AnirudhAP2k/CorpConnect/commit/cc2f7d728fc253c037474f3b36c27524f94c776c))
* wire pitch lifecycle notifications into submit and review actions ([c930d68](https://github.com/AnirudhAP2k/CorpConnect/commit/c930d68e00737fbcef722b54bad6beb2df080117))

# [1.3.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.2.0...v1.3.0) (2026-06-10)


### Bug Fixes

* update API route to enforce Organization role governance constraints ([d522c27](https://github.com/AnirudhAP2k/CorpConnect/commit/d522c2706ad7ed80753d3e347dd9a82277514883))
* update task list tracking for Enterprise messaging and AI brainstorming ([a41af25](https://github.com/AnirudhAP2k/CorpConnect/commit/a41af257c4038095f3c002772de320b305e57cb4))


### Features

* add Enterprise Group Messaging, EventPitch and EventReport models to schema ([7da423c](https://github.com/AnirudhAP2k/CorpConnect/commit/7da423cf1635cadf1479f2cb79adb631c3aa28b3))
* add group prefixing helper in ws-service room names ([916b463](https://github.com/AnirudhAP2k/CorpConnect/commit/916b463e75052058193e76806e6e9a956bf69af9))
* add Zod validation schemas for EventPitch inputs ([59912c8](https://github.com/AnirudhAP2k/CorpConnect/commit/59912c85132df73c9ca9a4078f1428463adb18d8))
* Added the .env.example for ws-service ([96eead2](https://github.com/AnirudhAP2k/CorpConnect/commit/96eead21cde2e034346bef3ab27c22d61a30bb4f))
* Added the functionality to create in-app notification for the Organization creation and to do verification ([6f61835](https://github.com/AnirudhAP2k/CorpConnect/commit/6f61835b8edf687a19446d014845150adcfd20a0))
* build AdminPitchReview component for org admins ([3000baa](https://github.com/AnirudhAP2k/CorpConnect/commit/3000baac14d640f796c279fa1c3a074d5ace5b32))
* build BrainstormChat component for multi-turn brainstorming ([58895a8](https://github.com/AnirudhAP2k/CorpConnect/commit/58895a8d5a59e603913d2f83f426d5358b5fb5c5))
* build GroupChatWindow component for multi-participant conversation ([b31b4e9](https://github.com/AnirudhAP2k/CorpConnect/commit/b31b4e9a51802c7035fa31a151d19a3a9c7947ca))
* build GroupConversationList component for sidebar stacked avatars ([478597e](https://github.com/AnirudhAP2k/CorpConnect/commit/478597eee96ff15ddd9fb5494513ceca741efb06))
* build GroupMembersPanel component for role governance and member removal ([7546124](https://github.com/AnirudhAP2k/CorpConnect/commit/7546124907a8a3b1b157ae1edd540f96c0103bd8))
* build GroupMessageBubble component displaying sender name and org affinity ([841ebcd](https://github.com/AnirudhAP2k/CorpConnect/commit/841ebcd9631abe90bc67b16ecdcf1b8e53346fde))
* build MemberPitchCard component for dashboard visibility ([1a465fe](https://github.com/AnirudhAP2k/CorpConnect/commit/1a465fed592ae14f8e295f3f7a770d7020bc4a56))
* build PitchBriefModal component for brief editing and submission ([a3864a0](https://github.com/AnirudhAP2k/CorpConnect/commit/a3864a0a43950fc9fad6cc9581f621078c3d7749))
* define database-driven messaging types in domain layer ([7114523](https://github.com/AnirudhAP2k/CorpConnect/commit/71145239edb4310f1d89933bf449217866ac8f51))
* define EventPitch types and interfaces in domain layer ([7cf3a0f](https://github.com/AnirudhAP2k/CorpConnect/commit/7cf3a0f886347d712268d1b73db3a0b13e931a25))
* document architecture and schema flow for Enterprise-tier features ([5860a34](https://github.com/AnirudhAP2k/CorpConnect/commit/5860a346769359d7d679e9fb8fc391a924caab8c))
* export public API barrel for messaging domain ([a067488](https://github.com/AnirudhAP2k/CorpConnect/commit/a067488524617da5f4c3cdbff97fc4dacdac0e18))
* export public API barrel for pitches domain ([e2bcf68](https://github.com/AnirudhAP2k/CorpConnect/commit/e2bcf68855c1e01a61f776755059652cf812abe0))
* export transferOrganizationOwnershipAction from organizations domain ([0308970](https://github.com/AnirudhAP2k/CorpConnect/commit/0308970e4f7fe7669b508413355cbdd62f409d99))
* extend AI client with brainstorm message and brief extraction handlers ([409da2a](https://github.com/AnirudhAP2k/CorpConnect/commit/409da2a8d33f4f12bf53a96fe90a82633173da4b))
* implement AI brainstorming and brief extraction endpoint in Python service ([77fe4a7](https://github.com/AnirudhAP2k/CorpConnect/commit/77fe4a7a0e5260d519e0f622334ea30ed298c1f0))
* implement AI Event Planner server-rendered page ([5c0f0c3](https://github.com/AnirudhAP2k/CorpConnect/commit/5c0f0c3bd72f38da66c577b632c77a6111dbb08e))
* implement API proxy route for brainstorm briefs ([49b2e0d](https://github.com/AnirudhAP2k/CorpConnect/commit/49b2e0d6b064eeb5ec2acbf5e37128974b3b50ea))
* implement API proxy route for brainstorm chat messages ([1739aff](https://github.com/AnirudhAP2k/CorpConnect/commit/1739aff73174bc0fd15a6edc6d9636f1a86fb3e7))
* implement messaging actions in domain layer ([966390d](https://github.com/AnirudhAP2k/CorpConnect/commit/966390d5d90e5082895a21554217a951793b3162))
* implement messaging queries in domain layer ([65a0f92](https://github.com/AnirudhAP2k/CorpConnect/commit/65a0f929f91ae2cdfa67f0a2b869bb2ada4283e6))
* implement read queries for EventPitch domain ([13053a0](https://github.com/AnirudhAP2k/CorpConnect/commit/13053a0a7db4d0130d5fe2dd9c04750d38fd3f8c))
* implement real-time group conversation socket hook ([4eb5d05](https://github.com/AnirudhAP2k/CorpConnect/commit/4eb5d056eb311f7afaf1c3be67536b0bda0dc5c3))
* implement REST API route for accepting group invitations ([dde84b9](https://github.com/AnirudhAP2k/CorpConnect/commit/dde84b9003d62839444f3917f654d21e68a8748a))
* implement REST API route for creating group invitations ([0f310d4](https://github.com/AnirudhAP2k/CorpConnect/commit/0f310d4621e8da56d2c4e259bc2ecb6d7a1bfed6))
* implement REST API route for paginated group messages ([7824fc7](https://github.com/AnirudhAP2k/CorpConnect/commit/7824fc795488c650e6d78b2508b3d2ea54365177))
* implement REST API route for rejecting group invitations ([554a93d](https://github.com/AnirudhAP2k/CorpConnect/commit/554a93dc5184401caa281f9731c050e0f7598b34))
* implement REST API route to fetch and create group conversations ([52c796a](https://github.com/AnirudhAP2k/CorpConnect/commit/52c796a31ebe62a347ca691c8480708354af0a35))
* implement Server Actions for EventPitch lifecycle ([ca84ca7](https://github.com/AnirudhAP2k/CorpConnect/commit/ca84ca711c4f30cd9373180c117304aa56010053))
* implement server-rendered group chat page ([bc55ca0](https://github.com/AnirudhAP2k/CorpConnect/commit/bc55ca0f3463f9f5255a7f1b541b03d830204145))
* implement Socket.io event handlers for group messaging ([685f514](https://github.com/AnirudhAP2k/CorpConnect/commit/685f514bf07681465ea2263b3d9dcde371033640))
* implement Transfer Ownership and limit to 5 admins in Organization role governance ([d2e61ab](https://github.com/AnirudhAP2k/CorpConnect/commit/d2e61ab6591c45e7c12a6d4c64bb58cceed9cb13))
* integrate Enterprise groups section in messaging layout sidebar ([4f93f3e](https://github.com/AnirudhAP2k/CorpConnect/commit/4f93f3e70456da6fa855dbe654a9e6b960deac27))
* register brainstorm router in FastAPI entrypoint ([61688cc](https://github.com/AnirudhAP2k/CorpConnect/commit/61688cc29ab31960fd79fa787a6bc35a3188c86b))
* register group messaging socket event handler ([79c3c79](https://github.com/AnirudhAP2k/CorpConnect/commit/79c3c7909e68ec6ccd8a4abc31aaf3e26b91f386))

# [1.2.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.1.0...v1.2.0) (2026-06-01)


### Bug Fixes

* Minoe update to display the warning as a toast message ([81bcb0e](https://github.com/AnirudhAP2k/CorpConnect/commit/81bcb0e4bd09bddb7e3f0543378bab7fb75a86ec))
* Minor fix in the OrganizationSwitcher component for image element ([98a8daa](https://github.com/AnirudhAP2k/CorpConnect/commit/98a8daa7669d20e386094eff3ce996e0d343bc2a))
* Removed createNotification as it is a mutation and does not belong in queries.ts ([7ab9c40](https://github.com/AnirudhAP2k/CorpConnect/commit/7ab9c40bc5cd62e13a245a778bfaba8e7e667172))
* Updated admin server actions to use Notifications domain ([29db54b](https://github.com/AnirudhAP2k/CorpConnect/commit/29db54bd9994c9f5fd0e0e4018704eded4efcbd7))
* Updated connecton-notification job to use Notifications domain ([0b0662f](https://github.com/AnirudhAP2k/CorpConnect/commit/0b0662f8e3fed7a3324467182730daebc63a544e))
* Updated createEvent server action to create the Notification for the newly created event ([9d567b6](https://github.com/AnirudhAP2k/CorpConnect/commit/9d567b616b61ba9f3b309c146e640950b3fa1ef0))
* Updated InAppAdapter to createNotification via prisma ([c999c87](https://github.com/AnirudhAP2k/CorpConnect/commit/c999c874ed97b4932e269566a560a4fd83b884c3))
* Updated job-processor to process eventReminder and virtualRoomCreated job event via Notifications domain ([309a26a](https://github.com/AnirudhAP2k/CorpConnect/commit/309a26a114365d1ee2393794a1b8998b2c7d860b))
* Updated meeting-notification job to use Notifications domain ([e3f12d3](https://github.com/AnirudhAP2k/CorpConnect/commit/e3f12d3da3b261dda1b910f67dfc19153549f5e2))
* Updated NotificationBell component to use notification server action ([31bd4e1](https://github.com/AnirudhAP2k/CorpConnect/commit/31bd4e1788fa233dcc4cd332b9f364d2cc727ee2))
* Updated NotificationBell component to use Notifications domain ([5a592a4](https://github.com/AnirudhAP2k/CorpConnect/commit/5a592a4b3a59c0c49a2ad73b61e64fc1973880cb))
* Updated notifications server actions to use Notifications domain ([6768c00](https://github.com/AnirudhAP2k/CorpConnect/commit/6768c00420c782fb6b5a830e133634ede8b22be1))
* Updated org-verification job to use Notifications domain ([4e9779a](https://github.com/AnirudhAP2k/CorpConnect/commit/4e9779acb3739243605d483762c076d707609e6b))
* Updated organizations route to use Notifications domain ([8e6577d](https://github.com/AnirudhAP2k/CorpConnect/commit/8e6577d68f1cc40ae1473afad48dadeb4f467f0a))
* Updated TopHeader component to use Notifications domain ([7041e87](https://github.com/AnirudhAP2k/CorpConnect/commit/7041e87ac55c4af14b50010cacf3ec9866be0a35))


### Features

* Added the functionality to create notification for livekit room creation ([e9419f5](https://github.com/AnirudhAP2k/CorpConnect/commit/e9419f542e9af1c2e1a95b10b0647a6cdc499932))
* Added VIRTUAL_ROOM_OPENED for JobType enum in prisma ([d4043ef](https://github.com/AnirudhAP2k/CorpConnect/commit/d4043ef59769dc24beccced34f9e917d5c62a77e))
* Developed email.adapter for Notification domain ([c7aa9a0](https://github.com/AnirudhAP2k/CorpConnect/commit/c7aa9a081c2763c2804ff559ca1903db47cd6ed8))
* Developed event-reminder handler for Notification domain ([afcdab0](https://github.com/AnirudhAP2k/CorpConnect/commit/afcdab06ecce86945e181aaecd09960f2b19eb50))
* Developed google-chat.adapter for Notification domain ([188acc9](https://github.com/AnirudhAP2k/CorpConnect/commit/188acc940bb020b86cd9fb6d207d5e38890d56f8))
* Developed in-app.adapter for Notification domain ([941cf8a](https://github.com/AnirudhAP2k/CorpConnect/commit/941cf8ad71755b2613ee3b1e4b69e0118f7d426c))
* Developed index entry point for Notification domain ([18efe4f](https://github.com/AnirudhAP2k/CorpConnect/commit/18efe4f89269263c1c575fc508fc4949a9359cb7))
* Developed notification channel registry for Notification domain ([f3b7c10](https://github.com/AnirudhAP2k/CorpConnect/commit/f3b7c1037438c10ef3c8728eadbb2091de173ff2))
* Developed Notification domain server actions ([929883f](https://github.com/AnirudhAP2k/CorpConnect/commit/929883f9f1f96f22a0362fef4b5bdf7e3bb5e874))
* Developed queries for Notification domain ([32d519a](https://github.com/AnirudhAP2k/CorpConnect/commit/32d519acbecc673d200d4b36148f1594340990a1))
* Developed slack.adapter for Notification domain ([53c9979](https://github.com/AnirudhAP2k/CorpConnect/commit/53c997935a4cb2ac06992124a9bdd830ce0ecd66))
* Developed type defination for Notification domain ([5703fca](https://github.com/AnirudhAP2k/CorpConnect/commit/5703fca47f51b967f394c8b8474a1bfa8bc0cf0b))
* Developed virtual-roon handler for Notification domain ([1772cbc](https://github.com/AnirudhAP2k/CorpConnect/commit/1772cbc16f26db5932e0c5ecc72f9b8906e1ecad))

# [1.1.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.0.0...v1.1.0) (2026-05-26)


### Bug Fixes

* Added the functionality to create a verification notification for org-verification job ([955339e](https://github.com/AnirudhAP2k/CorpConnect/commit/955339e365c2c157effd2d266e8f80f31f75801d))
* Added UploadResult type defination in types utility ([7b31212](https://github.com/AnirudhAP2k/CorpConnect/commit/7b31212afb9b57af3fe5cab936797e9573f02ce2))
* Added VerificationReminderBanner to organization profile page ([beadb06](https://github.com/AnirudhAP2k/CorpConnect/commit/beadb068cec3ef0dd2804b43d86c8780a772fe58))
* Developed file uploader to server actions ([a6fa23e](https://github.com/AnirudhAP2k/CorpConnect/commit/a6fa23e9259c103fec265f877ac000d8d207deff))
* IP fetching fix + Refresh token destructuring fix in session-refresh route ([2e01192](https://github.com/AnirudhAP2k/CorpConnect/commit/2e01192626907d8772c6a9f11c626dbb6a7fd193))
* Minor update in the OrganizationFOrm uploadResult image url access ([64e4f0b](https://github.com/AnirudhAP2k/CorpConnect/commit/64e4f0bead4f9a91d81850f477120620e2a13e0e))
* Minor update in uploadResult image url access ([8c614da](https://github.com/AnirudhAP2k/CorpConnect/commit/8c614da45e82e57a5051c6bb329ec91a3b081d96))
* Removed file-upload api as it is replaced by server action ([45ea913](https://github.com/AnirudhAP2k/CorpConnect/commit/45ea913930f407d4ae92935dd16243cc334f7900))
* Updated constant for ALLOWED_MIME and KYB_DOC_TYPES constant defination ([58bc4a7](https://github.com/AnirudhAP2k/CorpConnect/commit/58bc4a7dd0265fc5c5bef9544365ac6b2169b913))
* Updated file-uploader utility to use server action instead of api ([47487ef](https://github.com/AnirudhAP2k/CorpConnect/commit/47487ef41193f0d790aeba55392f1f7234a74dd0))
* Updated org-documents upload functionality to use file-uploader utility ([ac531d5](https://github.com/AnirudhAP2k/CorpConnect/commit/ac531d5020ed4e3397a68dda408c18f7c7b221fa))
* Updated organization domain validation to for orgDocumentUploadSchema validation ([6d2414b](https://github.com/AnirudhAP2k/CorpConnect/commit/6d2414bccb6d638e523db2925ddb12e6fad7d82d))


### Features

* Developed AdminSendNotification component ([07aad69](https://github.com/AnirudhAP2k/CorpConnect/commit/07aad69a8b179677655afe8b37622207a1d2e31d))
* Developed app admin server actions ([273a99b](https://github.com/AnirudhAP2k/CorpConnect/commit/273a99b6d309738220c2c0341c49007acdd6c470))
* Developed the functionality for admin to send notification and email to the admin/owner of the organization ([77e9351](https://github.com/AnirudhAP2k/CorpConnect/commit/77e93510c0c10f96fe4bdd51b7cb7fbc6536fe1d))
* Developed the functionality for AdminSendNotificationButton for app admin ([6efa962](https://github.com/AnirudhAP2k/CorpConnect/commit/6efa962a79372aa98a0a8b42849cf07cd54c3637))

# 1.0.0 (2026-05-19)


### Bug Fixes

* Added new test case for user-domain checks ([d7e6ebb](https://github.com/AnirudhAP2k/CorpConnect/commit/d7e6ebb5734e7576af08ba1a9ef86ce615c4e69d))
* ci pipline to use pnpm ([c00fbfd](https://github.com/AnirudhAP2k/CorpConnect/commit/c00fbfd97da9614db8e58eaad9ce6161cc771200))
* commented prod-deploy.yml temporarily ([51bd67f](https://github.com/AnirudhAP2k/CorpConnect/commit/51bd67f97c06105862b32eb0b89bc08d60c4dd34))
* minor fix in release yml ([422e85c](https://github.com/AnirudhAP2k/CorpConnect/commit/422e85c69e20aa683a81c39cd02f6dd7f7f24242))
* minor fix in sample.tse.ts ([128db68](https://github.com/AnirudhAP2k/CorpConnect/commit/128db684954a90d0f7510e56e4ff74d9eb00ebae))


### Features

* Add CI workflow with Jest, ESLint, and type checking ([7877f1f](https://github.com/AnirudhAP2k/CorpConnect/commit/7877f1f3a7411d72ed3833a6c0de208bd98dc0ea))
* Added .releaserc.json for semantic-release ([56ee2d9](https://github.com/AnirudhAP2k/CorpConnect/commit/56ee2d96cf62a839020b858c346513048ed0feeb))
* Added release.yml for tracking releases and versioning ([f95573a](https://github.com/AnirudhAP2k/CorpConnect/commit/f95573aa537930b3f823088b93eb1b1bcd20d5e1))
* Installed sematic release and its plugins for release versioning ([bea93d2](https://github.com/AnirudhAP2k/CorpConnect/commit/bea93d2ad07f19c075fc1bfc67d6a581aae91d2d))
* Installed sematic release and its plugins for release versioning ([c4fea0d](https://github.com/AnirudhAP2k/CorpConnect/commit/c4fea0d05c24b75c442c169367cf04bc133d9c81))
