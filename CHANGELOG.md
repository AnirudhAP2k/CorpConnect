# [1.21.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.20.0...v1.21.0) (2026-07-20)


### Bug Fixes

* **ai-service:** clean up formatting in ai-service client ([822d5cd](https://github.com/AnirudhAP2k/CorpConnect/commit/822d5cd30f08ba22edf2ec9670d5e3afe323b33a))
* **ai-service:** normalize roughDraft input for LLM cache key ([6db1396](https://github.com/AnirudhAP2k/CorpConnect/commit/6db1396a9812f40707de6240cf1159cf44c534cd))
* **components:** specify explicit width and height on Image component ([bf79382](https://github.com/AnirudhAP2k/CorpConnect/commit/bf793826bd194be2dbf51a142b1ee9404e303792))
* **sentry:** disable debug mode in instrumentation setup ([aea0162](https://github.com/AnirudhAP2k/CorpConnect/commit/aea016217a81ec995032efc7fa949cfb280e25cf))


### Features

* **ai-service:** update chatbot context query to use networkingIntent ([d95883c](https://github.com/AnirudhAP2k/CorpConnect/commit/d95883caadf6d8e57ed4cbab3b90ea602222d784))
* **components:** update organization form with networkingIntent selector ([e19d2e5](https://github.com/AnirudhAP2k/CorpConnect/commit/e19d2e589e234e4b8655a145ce13210aff98bbbe))
* **docker:** add compose.dev.yaml and environment variable pass-through ([a688f23](https://github.com/AnirudhAP2k/CorpConnect/commit/a688f239e65a9b47741103c71fb3003543432a7c))
* **docker:** add dev target stage in Dockerfile ([b8d4a0e](https://github.com/AnirudhAP2k/CorpConnect/commit/b8d4a0e5d1ac7e51e5f91dcfab481466e906ce41))
* **domain-org:** extract networkingIntent in organization actions ([8a5724b](https://github.com/AnirudhAP2k/CorpConnect/commit/8a5724b78473cca289ad5ccdc6571d590813ed4d))
* **domain-org:** update organization schemas with NetworkingIntent ([bd19b68](https://github.com/AnirudhAP2k/CorpConnect/commit/bd19b68c4fc4469ae4fcc1e511cc2e3b682dfa6a))
* **events:** add getUserHostedEvents query for hosted event management ([00fa0ed](https://github.com/AnirudhAP2k/CorpConnect/commit/00fa0ed1713d9e1d90a5ead35b58585a8139019b))
* **my-events:** add Hosted events tab and hosted event list view ([4386d83](https://github.com/AnirudhAP2k/CorpConnect/commit/4386d830762a79d52faf489fc525774ae9760803))
* **org-ui:** populate networkingIntent in organization edit page ([455541f](https://github.com/AnirudhAP2k/CorpConnect/commit/455541f355e3b0b382042560d899b89f3f3d034e))
* **org-ui:** render networking intent badges on organization profile ([9212d81](https://github.com/AnirudhAP2k/CorpConnect/commit/9212d8190948a2cb232dba3911d093c59bd8db6b))
* **schema:** replace HiringStatus enum with NetworkingIntent ([a2114d2](https://github.com/AnirudhAP2k/CorpConnect/commit/a2114d2f3ae0aab8c2cfd31a9b82f5e4f921ba35))
* **validation:** update OrganizationCreateSchema to use NetworkingIntent ([241ffd6](https://github.com/AnirudhAP2k/CorpConnect/commit/241ffd6bd39d4c8428847f97e0a54e99c3754e7e))

# [1.20.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.19.0...v1.20.0) (2026-07-20)


### Bug Fixes

* **billing:** redirect unauthorized billing access with flash code ([17faece](https://github.com/AnirudhAP2k/CorpConnect/commit/17faece7e8b2cca4bc857596091f26193f74714c))
* **db:** accept data loss on prisma db push in entrypoint ([4427069](https://github.com/AnirudhAP2k/CorpConnect/commit/442706953a4de47abca7b16b9819ef9ec3015aaa))
* **docker:** copy pnpm-workspace.yaml in deps stage ([d63d1ff](https://github.com/AnirudhAP2k/CorpConnect/commit/d63d1ff2d2748f7fc5dc57db3960d41d5a85b2a7))
* **docker:** parameterize environment and copy prisma engine module ([4ad83ec](https://github.com/AnirudhAP2k/CorpConnect/commit/4ad83ec169f3b6affa4faa8c5986cf79abfe158e))
* **logger:** handle write stream creation and write errors ([e3cde59](https://github.com/AnirudhAP2k/CorpConnect/commit/e3cde59d68f0f1b2a0953c238d9838338c986cf2))
* **lv-service:** use optimized multi-stage docker build with correct port ([d5ed5ca](https://github.com/AnirudhAP2k/CorpConnect/commit/d5ed5cae9a56aec397229d49930140e92e6fc500))
* **prisma:** remove unsupported vector types from schema ([f9b3a32](https://github.com/AnirudhAP2k/CorpConnect/commit/f9b3a32fbb7f32d905de861d6f94369e3cf7f350))
* **sentry:** use public env var for client-side sentry DSN ([9278a92](https://github.com/AnirudhAP2k/CorpConnect/commit/9278a92b4cf51c68d9ab4cbb0a8c2949180982f2))
* **ws-service:** optimize docker build with frozen-lockfile and prod only dependencies ([834681f](https://github.com/AnirudhAP2k/CorpConnect/commit/834681ff00dbdce0567bfeac2f1511ea8692b0a0))


### Features

* **ai-service:** add dockerignore file ([8c06685](https://github.com/AnirudhAP2k/CorpConnect/commit/8c0668530d4366df74a8b17f6f824e14fb21af96))
* **compose:** integrate pgvector database and db-migrate orchestration service ([e2318d8](https://github.com/AnirudhAP2k/CorpConnect/commit/e2318d8f214e078eb2b3dd03c8ac46d592fa6881))
* **compose:** use migrate target for db-migrate and pass env args ([f73d99e](https://github.com/AnirudhAP2k/CorpConnect/commit/f73d99ecdf5b77a65db4c592dcdce63d10ca4b69))
* **config:** add NEXT_PUBLIC_SENTRY_DSN to env template ([0233cdc](https://github.com/AnirudhAP2k/CorpConnect/commit/0233cdcba400dc40c2051c3115e47adcfb237d5f))
* **docker:** add migrate stage and pass build arguments ([af48eb1](https://github.com/AnirudhAP2k/CorpConnect/commit/af48eb19cde337be18ae3cea45db4e2848199e42))
* **layout:** integrate QueryToastListener in root layout ([4ffb9ed](https://github.com/AnirudhAP2k/CorpConnect/commit/4ffb9ed882035601f85104b64240a865133f45f9))
* **lv-service:** add @types/crypto-js dev dependency ([19fda88](https://github.com/AnirudhAP2k/CorpConnect/commit/19fda887d1cb4829698406b3ea480a7ab86031f5))
* **lv-service:** add dockerignore file ([20a178b](https://github.com/AnirudhAP2k/CorpConnect/commit/20a178bccbd0d3277b46d03ebf4576a7ee361b15))
* **shared:** add flash toast registry ([e9617b7](https://github.com/AnirudhAP2k/CorpConnect/commit/e9617b7c575c16fcf30bf6c25a38c5a8df2b842c))
* **shared:** add QueryToastListener component ([8a6f321](https://github.com/AnirudhAP2k/CorpConnect/commit/8a6f321140430147c97500f8b95e3e059e9541ae))
* **ws-service:** add dockerignore file ([126711b](https://github.com/AnirudhAP2k/CorpConnect/commit/126711b7e0f927538173156a3c26fd10193b85ef))

# [1.19.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.18.0...v1.19.0) (2026-07-02)


### Bug Fixes

* **ci:** optimize workflow jobs ([49a3abb](https://github.com/AnirudhAP2k/CorpConnect/commit/49a3abb8af0e7f2edd8d4343081c42c4fdd27be8))


### Features

* **calendar:** add reusable generic EventCalendar component ([e7d1b66](https://github.com/AnirudhAP2k/CorpConnect/commit/e7d1b66fc7a93bfafc48dd8a152c043ea4496531))
* **calendar:** refactor GroupCalendar to use generic EventCalendar ([5701419](https://github.com/AnirudhAP2k/CorpConnect/commit/5701419818bf67edf1fb65f2730e7d2e0fe3ddff))
* **ci:** add Render CD workflow for automated deployments ([3bd66ba](https://github.com/AnirudhAP2k/CorpConnect/commit/3bd66ba08538fc7142f6e5ef5d3782dc5f7d949f))
* **docs:** update task checklist to mark phase 17 completed ([40a599a](https://github.com/AnirudhAP2k/CorpConnect/commit/40a599a7230f543a3dbe71c1966674f5f37a982c))
* **events:** add /events/invite public route prefix ([47d442f](https://github.com/AnirudhAP2k/CorpConnect/commit/47d442fea75e03e3d5adf16d312815c9c5b94e2a))
* **events:** add EventInvite model and SEND_EVENT_INVITE_EMAIL job type ([16c49b4](https://github.com/AnirudhAP2k/CorpConnect/commit/16c49b4fa397cd67dc424bbdf93f8efa76668a91))
* **events:** add getEventInviteByToken query ([64af99e](https://github.com/AnirudhAP2k/CorpConnect/commit/64af99e621da3d392257a455263ae89fcb09c3ca))
* **events:** add guest invitation modal for hosts ([0952d69](https://github.com/AnirudhAP2k/CorpConnect/commit/0952d69969a58e76040bb9018aaa97d7fbbb83c4))
* **events:** add HTML email template for external event invitation ([7aad658](https://github.com/AnirudhAP2k/CorpConnect/commit/7aad658b69a142f5ebf060dd30a5621407641657))
* **events:** add processEventInviteEmail background job processor ([8b409fb](https://github.com/AnirudhAP2k/CorpConnect/commit/8b409fb2bdc7da2b765a61a7af4d9c984a3502f7))
* **events:** add public invite acceptance page and atomic registration ([9bb56e9](https://github.com/AnirudhAP2k/CorpConnect/commit/9bb56e9034a30b3cbefcfa184c96cfed2dafa7ab))
* **events:** add sendEventInvitesAction server action ([48a564d](https://github.com/AnirudhAP2k/CorpConnect/commit/48a564d8459f1f07870653e3ec6b7d2fadbbfad4))
* **events:** add sendEventInvitesSchema zod validation ([150a826](https://github.com/AnirudhAP2k/CorpConnect/commit/150a826bc52d193a52d224c03bd35555426ae6c3))
* **events:** allow public access to dynamic event invite links ([cf557b9](https://github.com/AnirudhAP2k/CorpConnect/commit/cf557b9e123a4bb2c68379b1a61374b38db89cf7))
* **events:** export new event invitation schemas, queries, and actions ([7c46185](https://github.com/AnirudhAP2k/CorpConnect/commit/7c46185ac41a1b68f238b02024d16249c1da0b79))
* **events:** integrate InviteGuestsModal into event detail sidebar ([315dab0](https://github.com/AnirudhAP2k/CorpConnect/commit/315dab057aa05fad75741b817282edb7f6aec461))
* **events:** register SEND_EVENT_INVITE_EMAIL job in main job processor ([4890499](https://github.com/AnirudhAP2k/CorpConnect/commit/4890499a0a0e9dc67c7f96aa90a65fed65425030))

# [1.18.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.17.0...v1.18.0) (2026-07-02)


### Bug Fixes

* adjust landing page heading sizing and collection grid columns ([baad9ef](https://github.com/AnirudhAP2k/CorpConnect/commit/baad9effad2d6513bbe4ab9cc20a9b9a3de32d8e))
* **ai:** minor fix in the DockerFile for sentence transformer setup ([e7eb667](https://github.com/AnirudhAP2k/CorpConnect/commit/e7eb667d60ba2beb43156f21aead42c684786be8))
* **ci:** updated the nodejs and python jobs to run independently to each other ([56a48d6](https://github.com/AnirudhAP2k/CorpConnect/commit/56a48d653068ae0ae4088ffa179c26863069b31e))
* make nextjs standalone build conditional to fix Windows build errors ([231713a](https://github.com/AnirudhAP2k/CorpConnect/commit/231713a026ff5f01d66101d98391d41c54909971))
* **script:** removed security-check.ps1 script ([51d8799](https://github.com/AnirudhAP2k/CorpConnect/commit/51d87994adbf4e6a911b5d26423156f85e6febe9))


### Features

* add enterprise devops implementation plan documentation ([09f5f0e](https://github.com/AnirudhAP2k/CorpConnect/commit/09f5f0eb1426390de2547d45208fe04ed23f256a))
* add local database and optimize docker-compose services ([8a91ba6](https://github.com/AnirudhAP2k/CorpConnect/commit/8a91ba6b6ae353bc59b0a082332577ea878e7079))
* add modular terraform configuration for local docker database ([6880d69](https://github.com/AnirudhAP2k/CorpConnect/commit/6880d690f25360538b574009fccce61355f3dd2f))
* configure gitignore for terraform and local development files ([c992857](https://github.com/AnirudhAP2k/CorpConnect/commit/c9928573d438a7c360619bddc943a5dbf324d713))
* configure nextjs standalone build and update Dockerfile ([3e16b1a](https://github.com/AnirudhAP2k/CorpConnect/commit/3e16b1adc0c7aab0000acc70cf49cd541ee8b1ae))
* implement devsecops pre-commit security checks ([fd12585](https://github.com/AnirudhAP2k/CorpConnect/commit/fd12585a97855f2f5ad1360b14373d58e80fcaf8))
* **prometheus:** setup prometheus monitoring tool ([dccb747](https://github.com/AnirudhAP2k/CorpConnect/commit/dccb74795718fe8829bbd1d6fc838795defa1aec))
* update ci pipeline with path-based filtering and python checks ([3a040e7](https://github.com/AnirudhAP2k/CorpConnect/commit/3a040e747e90c2b3ff025d62443f97d3b1792431))

# [1.17.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.16.4...v1.17.0) (2026-06-30)


### Features

* retrieve existing brainstorm session if it exists ([d86d8fd](https://github.com/AnirudhAP2k/CorpConnect/commit/d86d8fdbfaff032a69b19e8936ae9dee2a788043))

## [1.16.4](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.16.3...v1.16.4) (2026-06-29)


### Bug Fixes

* update chat message role database cast to ChatRole enum ([a48af1c](https://github.com/AnirudhAP2k/CorpConnect/commit/a48af1cced4927ed18fb38774f697d959d384f12))

## [1.16.3](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.16.2...v1.16.3) (2026-06-29)


### Bug Fixes

* increase maximum event description length to 10000 characters ([d250531](https://github.com/AnirudhAP2k/CorpConnect/commit/d250531bfef15692144a2c7b91bc52efe14f3d49))
* remove debug console log for hashed tokens in revokeToken ([6412f66](https://github.com/AnirudhAP2k/CorpConnect/commit/6412f66aaf85223ba26c2c44dbf758f17a3d953d))
* update brainstorm AI router prefix to /chat/brainstorm ([9bfbde3](https://github.com/AnirudhAP2k/CorpConnect/commit/9bfbde3c1fe02f046c29ace4474846edb62e1e13))

## [1.16.2](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.16.1...v1.16.2) (2026-06-29)


### Bug Fixes

* make title optional in OptionsTypes interface ([1b80941](https://github.com/AnirudhAP2k/CorpConnect/commit/1b8094134ee058c344fa55420625e0c31086f454))
* refactor category server actions to be type safe with correct OptionResult type ([5c53bde](https://github.com/AnirudhAP2k/CorpConnect/commit/5c53bdee6ececcdc07a674c52470cc12e741b9cd))
* restore parseData function and type handleError with never ([67a13ef](https://github.com/AnirudhAP2k/CorpConnect/commit/67a13ef221d6f4e7355622d2d75d927dd02bb5ab))
* update Dropdown handles to match standardized OptionResult structure ([8843910](https://github.com/AnirudhAP2k/CorpConnect/commit/8843910fda754d05bc9673b84a6b7e8e4d5c342d))
* update EditEventPageProps for Next.js 15 page props Promise compatibility ([f23c85d](https://github.com/AnirudhAP2k/CorpConnect/commit/f23c85d4240746a24497254ac8b5055575774aa2))
* update MyEventsPageProps for Next.js 15 searchParams Promise compatibility ([b3e28f1](https://github.com/AnirudhAP2k/CorpConnect/commit/b3e28f130e66de3a8b8eca7b78df910021f5fe2d))
* update OrganizationEventsPageProps for Next.js 15 params/searchParams Promise compatibility ([dcd7334](https://github.com/AnirudhAP2k/CorpConnect/commit/dcd7334068372beddb290bae2815d47339549a15))

## [1.16.1](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.16.0...v1.16.1) (2026-06-29)


### Bug Fixes

* **cloudinary:** add cloudinary to serverExternalPackages to prevent Webpack bundling error ([8297c1a](https://github.com/AnirudhAP2k/CorpConnect/commit/8297c1a40d764fd1fce0527838f1cd86d7c1ab16))
* **cloudinary:** secure connection and clean typescript env assertions ([9088f0f](https://github.com/AnirudhAP2k/CorpConnect/commit/9088f0fb79e7573c4b7e2cf9ad584299d3b0fbfd))

# [1.16.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.15.0...v1.16.0) (2026-06-29)


### Bug Fixes

* **git:** ignore local logs directory ([225e162](https://github.com/AnirudhAP2k/CorpConnect/commit/225e162f93af544ccce707de0c355dfdf655fd5d))
* **sentry:** consolidate withSentryConfig arguments to prevent TS2554 error ([2bdb0b8](https://github.com/AnirudhAP2k/CorpConnect/commit/2bdb0b8301ffff3d1a8dbfa820f74e1428bf4efc))


### Features

* add client-side Sentry initialization config ([bf8fc35](https://github.com/AnirudhAP2k/CorpConnect/commit/bf8fc358b5210bff25b9891bf69c9e4fc4dde2f3))
* add Edge runtime Sentry initialization config ([b99abc7](https://github.com/AnirudhAP2k/CorpConnect/commit/b99abc74e40f67a3398eae751fa42b1ee25dd707))
* add Sentry environment parameters to settings configuration ([9e060d9](https://github.com/AnirudhAP2k/CorpConnect/commit/9e060d9b36f69f8e5ee9de1168a2634e5c976f07))
* add server-side Sentry initialization config ([b5b7280](https://github.com/AnirudhAP2k/CorpConnect/commit/b5b7280686b2bf2c28bdf29104da1c5b80fda68a))
* **docs:** update monitoring and observability implementation plan ([f0e183a](https://github.com/AnirudhAP2k/CorpConnect/commit/f0e183a05b1c8a2c40cef6a43917c4532a07a203))
* initialize Sentry SDK in Python AI Service entry point ([2d164b3](https://github.com/AnirudhAP2k/CorpConnect/commit/2d164b3cb4b174cd24731ab3c6a7bc9e275f9900))
* **logging:** add daily rotating file logger utility with console interception ([0c20562](https://github.com/AnirudhAP2k/CorpConnect/commit/0c20562f79de46555a532d993c300fd16602858f))
* **sentry:** add global error boundary for root level error capturing ([bbc01f4](https://github.com/AnirudhAP2k/CorpConnect/commit/bbc01f4d1d51dbdf8da087ef605296d671b1f4e6))
* **sentry:** export client-side router transition hooks ([1875056](https://github.com/AnirudhAP2k/CorpConnect/commit/1875056f0b4a18a6bdf68c8b86ff560dafa879f2))
* **sentry:** initialize server-side sentry tracking and daily log interceptor ([8bc993d](https://github.com/AnirudhAP2k/CorpConnect/commit/8bc993d1d7e9eda51e4e6d0241e4888e04a86536))
* **sentry:** migrate legacy config files to nextjs standard instrumentation files ([ef49a90](https://github.com/AnirudhAP2k/CorpConnect/commit/ef49a90db9faaa01fa0eddd9d97c72cde2b48668))
* wrap next.config.ts with Sentry configuration helper ([f98dfb7](https://github.com/AnirudhAP2k/CorpConnect/commit/f98dfb702f95907d01933d4c96e988056676e66b))

# [1.15.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.14.0...v1.15.0) (2026-06-26)


### Bug Fixes

* check for duplicate category/industry before creation ([2c86b96](https://github.com/AnirudhAP2k/CorpConnect/commit/2c86b9667b43104f8a2fd2618dae7879b4c11882))
* show error toast on duplicate option creation ([7b61930](https://github.com/AnirudhAP2k/CorpConnect/commit/7b61930158b24cbd0fb4284ea84628270ea64412))


### Features

* add external event invitation tasks to roadmap ([a0229ef](https://github.com/AnirudhAP2k/CorpConnect/commit/a0229efb8f29b35925b05137898c42d8c5ba76ca))
* draft external event invitation flow design doc ([6d133ae](https://github.com/AnirudhAP2k/CorpConnect/commit/6d133aef5597da1cbfc30d89c04a365961c93c80))

# [1.14.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.13.0...v1.14.0) (2026-06-24)


### Bug Fixes

* **db:** removed redundant legacy sqlite db from prisma ([58acad3](https://github.com/AnirudhAP2k/CorpConnect/commit/58acad3818b595537e95a236e4c5c76541207304))
* **dropdown:** swap AlertDialog with Dialog for option creation ([fcc8195](https://github.com/AnirudhAP2k/CorpConnect/commit/fcc8195d9f032afe88ede06a04285d538a28c3f3))


### Features

* **orgs:** add orgTags to OrganizationDetail type ([23673b0](https://github.com/AnirudhAP2k/CorpConnect/commit/23673b072839a091373a9089e76aaf0e75d69e7e))
* **orgs:** add tags field to domain validation schemas ([1b4fa10](https://github.com/AnirudhAP2k/CorpConnect/commit/1b4fa105dc824d191817d91336718b6573d3d553))
* **orgs:** add tags field to OrganizationForm UI ([02063f4](https://github.com/AnirudhAP2k/CorpConnect/commit/02063f4aa71b5475fafa8dc4152822166593c5a3))
* **orgs:** add tags field to shared organization create schema ([9e60eda](https://github.com/AnirudhAP2k/CorpConnect/commit/9e60eda9c2b00d8ca264a005dbebdc853a2b8099))
* **orgs:** fetch orgTags in getOrganizationById query ([e66e434](https://github.com/AnirudhAP2k/CorpConnect/commit/e66e434730cbb90c5cbc5065d7c307842296635b))
* **orgs:** pre-populate tags in organization edit page ([8a3ff47](https://github.com/AnirudhAP2k/CorpConnect/commit/8a3ff470eb3551ef7cfd48bd5bef8dc2f64d2bfe))
* **orgs:** wire setOrgTags helper into create and update actions ([ccb2667](https://github.com/AnirudhAP2k/CorpConnect/commit/ccb2667ce8ecb318a96a4631b590eef565661d38))
* **ui:** add Dialog shadcn component ([a3de664](https://github.com/AnirudhAP2k/CorpConnect/commit/a3de6644f236105c19aa9550ce422ed66b923669))

# [1.13.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.12.0...v1.13.0) (2026-06-24)


### Bug Fixes

* enqueue SEND_INVITE_EMAIL job upon invite creation ([c7e1938](https://github.com/AnirudhAP2k/CorpConnect/commit/c7e193856639e837a5f22994b9c7a468285c4cda))
* remove obsolete invites trigger case ([321115b](https://github.com/AnirudhAP2k/CorpConnect/commit/321115b45bc31e4d7af4f6fe8524deda680cefcb))
* remove obsolete separate invite processing cron job ([994255d](https://github.com/AnirudhAP2k/CorpConnect/commit/994255d53c1fd3281b56ae84efd735a3f749a2fb))
* route member invite emails through unified job queue ([fd12d8b](https://github.com/AnirudhAP2k/CorpConnect/commit/fd12d8b10c269921e514c997c82c27b8eee046db))


### Features

* extract pending invites helper logic ([630e71d](https://github.com/AnirudhAP2k/CorpConnect/commit/630e71dde13c7195de3105405ccafff61b79d106))

# [1.12.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.11.0...v1.12.0) (2026-06-23)


### Bug Fixes

* updated the profile page to dispplay dynamic data ([27a7018](https://github.com/AnirudhAP2k/CorpConnect/commit/27a70186abb006525bef4dd080802c139fd718e4))


### Features

* exported the getUserProfileData for the user domain ([fee46d7](https://github.com/AnirudhAP2k/CorpConnect/commit/fee46d74799d8d94444bf1730822eff49aa0a42d))
* implemented the getUserProfileData function to get dynamic user data from db ([6905931](https://github.com/AnirudhAP2k/CorpConnect/commit/69059312062cd92b6bd3ccefa10f7d58add6e1bf))

# [1.11.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.10.0...v1.11.0) (2026-06-23)


### Bug Fixes

* fixed 404 issue for manage members page ([97a413f](https://github.com/AnirudhAP2k/CorpConnect/commit/97a413fa8e16281d0d0f6c6ccd3a830de84a0778))
* installed dpendencies via pnpm ([e868ffe](https://github.com/AnirudhAP2k/CorpConnect/commit/e868ffe494ee41ac566dab6f885360ea95bcc9bb))
* updated dpendencies for pnpm ([9c7ee81](https://github.com/AnirudhAP2k/CorpConnect/commit/9c7ee8115f84f2868b84715e5ead65c4e3337384))
* updated stripr apiVersion to lastest dahlia ([97f5d04](https://github.com/AnirudhAP2k/CorpConnect/commit/97f5d0459b296d3c95e7244bd0229211dc2dfaa5))
* updated the fetch of organizatoion details via oranization domain ([ac8690b](https://github.com/AnirudhAP2k/CorpConnect/commit/ac8690bab16f5030b41bcad6933ae9f74e9b1fba))


### Features

* installed updated version of dependencies ([43d46a9](https://github.com/AnirudhAP2k/CorpConnect/commit/43d46a92db6f2d66e8a7e703df30aa777b22bece))
* updated dependencies versions ([e0223a9](https://github.com/AnirudhAP2k/CorpConnect/commit/e0223a9daba26fd039185670491548f20e471b49))

# [1.10.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.9.0...v1.10.0) (2026-06-22)


### Bug Fixes

* **billing:** minor updated in the billing page ([4981fe6](https://github.com/AnirudhAP2k/CorpConnect/commit/4981fe6668f2cce9a3d5f3962a47bb8e1d88e9df))
* **billing:** resolve server-side crash on billing page authorization check ([bd9c81d](https://github.com/AnirudhAP2k/CorpConnect/commit/bd9c81dbd1cf50d845654fd8de1987717437686d))


### Features

* **ai:** update quota management to fetch ACTIVE api credentials ([bb26974](https://github.com/AnirudhAP2k/CorpConnect/commit/bb2697449d4c19d0c140f6334647b80ef4f59709))
* **api:** refactor organization api-credentials route to use domain module ([9bad339](https://github.com/AnirudhAP2k/CorpConnect/commit/9bad339ddc7063b716b1c1e11bb70ed485cc737c))
* **billing:** update subscribe route to use consolidated Razorpay Price IDs ([d8e68ef](https://github.com/AnirudhAP2k/CorpConnect/commit/d8e68ef1f1808556dcab24650a29c73d30992492))
* **constants:** centralize subscription plans, colors and features ([2cfde3b](https://github.com/AnirudhAP2k/CorpConnect/commit/2cfde3bab530de88541239ae7b647801aa3e3836))
* **db:** consolidate and squash database migrations to init baseline ([ba7485d](https://github.com/AnirudhAP2k/CorpConnect/commit/ba7485d77fafda97a929eaacb64730dd481dbbe1))
* **db:** update ApiCredential model for soft-delete support ([39c422a](https://github.com/AnirudhAP2k/CorpConnect/commit/39c422a32b5bf5dc2368783f04d92bcc76b9d182))
* **domain:** add api-credentials domain module ([1f60b28](https://github.com/AnirudhAP2k/CorpConnect/commit/1f60b2833033bcd41a1cb35277822623788509b0))
* **domain:** add api-credentials types defination interface ([4034bec](https://github.com/AnirudhAP2k/CorpConnect/commit/4034becafe5cdf922d408f97a9ac5a66cff191e1))
* **domain:** developed api-credentials queries interface ([0d15ee0](https://github.com/AnirudhAP2k/CorpConnect/commit/0d15ee05b281caea2040c88f7a5f00409a94f4c9))
* **domain:** developed api-credentials server actions ([d146a3e](https://github.com/AnirudhAP2k/CorpConnect/commit/d146a3eb39b7920f805698707653df23bfaef5b0))
* **payment:** add Razorpay price IDs and platform fee percent mapping ([b4a5936](https://github.com/AnirudhAP2k/CorpConnect/commit/b4a593650285810fd01787381103f4be57ffcaa9))
* **razorpay:** refactor razorpay webhook to use api-credentials domain ([de812b7](https://github.com/AnirudhAP2k/CorpConnect/commit/de812b72eb87fbf63256ff1c1997397bea172269))
* **stripe:** refactor stripe webhook to use api-credentials domain ([816e26d](https://github.com/AnirudhAP2k/CorpConnect/commit/816e26d5a34dc87529d27939246f6f14ffe14ae6))
* **user:** update getUserTier to query ACTIVE api credentials ([3f9b066](https://github.com/AnirudhAP2k/CorpConnect/commit/3f9b066cde8a791172f436bb95507308f699bda4))

# [1.9.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.8.0...v1.9.0) (2026-06-16)


### Bug Fixes

* updated the link for Login for Access button in home page ([a99924d](https://github.com/AnirudhAP2k/CorpConnect/commit/a99924d35ca4874fc607e236852eacd3737b9b4a))


### Features

* replace AI coming soon placeholder with live features panel ([a92734d](https://github.com/AnirudhAP2k/CorpConnect/commit/a92734d570cc421a272d9145925555afd8ff1331))

# [1.8.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.7.0...v1.8.0) (2026-06-16)


### Bug Fixes

* remove generateStaticParams to fix dynamic server usage ([7eda8f4](https://github.com/AnirudhAP2k/CorpConnect/commit/7eda8f42dc176ccbb3aa713483938e8b21b1db7c))
* update home page pricing link to /pricing ([9c49937](https://github.com/AnirudhAP2k/CorpConnect/commit/9c499376fea5bcf66ed628b66100e7bef61bdbee))


### Features

* change embedding dimensions to 384 and update pgvector setup ([b4219b8](https://github.com/AnirudhAP2k/CorpConnect/commit/b4219b880f7f348ce6cc69054a37317aa23ec041))
* increase event description maximum limit to 10000 ([2f591ec](https://github.com/AnirudhAP2k/CorpConnect/commit/2f591ec1c2ebfe3794697f3ac70bc86e63c34d99))

# [1.7.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.6.1...v1.7.0) (2026-06-16)


### Features

* **ai-service:** integrate HuggingFace Serverless Inference API for embeddings ([e8f006a](https://github.com/AnirudhAP2k/CorpConnect/commit/e8f006ac18bca205d919a66ce8f25ed39dccdb8e))

## [1.6.1](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.6.0...v1.6.1) (2026-06-15)


### Bug Fixes

* updated numpy version for ai-service ([f02b67d](https://github.com/AnirudhAP2k/CorpConnect/commit/f02b67d5aae8d148120ef43489b852213a2f8dd7))

# [1.6.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.5.0...v1.6.0) (2026-06-15)


### Bug Fixes

* **config:** updated JWT_MAX_AGE_SECONDS to 15 min ([9f4a61e](https://github.com/AnirudhAP2k/CorpConnect/commit/9f4a61e57313ac728fe7618b0a55402513cc0835))
* **events:** check AI quota before fetching recommended orgs ([7b3a9a9](https://github.com/AnirudhAP2k/CorpConnect/commit/7b3a9a9b62fc148f8041608744add54b0a1832bf))
* exported the types for all ai-service interfaces ([9aab9fd](https://github.com/AnirudhAP2k/CorpConnect/commit/9aab9fda227ece629b282b80a9dcf23072919d3d))
* fixed the build error ([1d2dec4](https://github.com/AnirudhAP2k/CorpConnect/commit/1d2dec4f26889015371cb673f4d993eeb0859a0d))
* imported the constants from constants/index.ts ([37b6d28](https://github.com/AnirudhAP2k/CorpConnect/commit/37b6d28a723abc8c4bf315e07372215c1fdaa328))
* imported the interface and constant from the types.ts utlity and constants/index.ts ([52cafb0](https://github.com/AnirudhAP2k/CorpConnect/commit/52cafb0273c6eabc5499b45f3ecd32e5e4302358))
* imported the interface from the types.ts utility ([b38a36e](https://github.com/AnirudhAP2k/CorpConnect/commit/b38a36e40525ae4536ebd54f85b5f87332faa25e))
* imported the interface from the types.ts utlity ([8782eb1](https://github.com/AnirudhAP2k/CorpConnect/commit/8782eb1ff42913145c895c3af08056ec1285f6b6))
* Pull from master + resolved conflicts ([afebe36](https://github.com/AnirudhAP2k/CorpConnect/commit/afebe361ac36ebd8a6af98bb84a1a477197c421c))
* Pull from master + resolved conflicts ([1847169](https://github.com/AnirudhAP2k/CorpConnect/commit/184716998a0dd7643616d88a0fbe986525aa89f7))
* updated CI check for only pull request ([357619e](https://github.com/AnirudhAP2k/CorpConnect/commit/357619e6c9dbd4cc7d705b32452811d59060b32b))
* **users:** conditionally query organization memberships ([ad40c1c](https://github.com/AnirudhAP2k/CorpConnect/commit/ad40c1c0f079ff58cc159ec4731e958dca24a7cf))


### Features

* **ai:** define AI credit limits and feature plan gates ([fcbeeb5](https://github.com/AnirudhAP2k/CorpConnect/commit/fcbeeb5a7582801c9cae008cc3643ec3b66a7fa9))
* **ai:** implement core quota validation and Server Actions ([1f592f1](https://github.com/AnirudhAP2k/CorpConnect/commit/1f592f14cbb15f3c0b92bdff25086e28d717158f))
* **api:** gate AI routes with quota check and usage deduction ([27ce75e](https://github.com/AnirudhAP2k/CorpConnect/commit/27ce75e4165c0b9499b373d58bf45c3d8b349d6c))
* **auth:** add getApiAuth utility for session-agnostic route authentication ([2514f89](https://github.com/AnirudhAP2k/CorpConnect/commit/2514f89e3060884c1b3d513ef550fb847c2b1d4e))
* **auth:** hash token in revokeToken and update cookie management ([c8d74cc](https://github.com/AnirudhAP2k/CorpConnect/commit/c8d74ccd7d1676d91f47313105eb47f80616e97c))
* **auth:** inject auth session header and update refresh token cookie key ([69086f6](https://github.com/AnirudhAP2k/CorpConnect/commit/69086f6ed849687f6c7a6920cb236117ba4bd3fd))
* **auth:** migrate next-auth to setRefreshToken and new cookie key ([db5de7c](https://github.com/AnirudhAP2k/CorpConnect/commit/db5de7ce21c8e23a5dd14e84b422f5e2c8cc0ed6))
* **billing:** display organization AI credit usage card ([d3cebb8](https://github.com/AnirudhAP2k/CorpConnect/commit/d3cebb82b9c4f19db1bc4ed180f0d38cc5ffffb5))
* **dashboard:** show AI usage count on dashboard and AI panels ([8369667](https://github.com/AnirudhAP2k/CorpConnect/commit/83696677154c469beee37234f2dc0c8f97c175f5))
* removed unused types and interfaces + defined the new types and interfaces ([cc484cb](https://github.com/AnirudhAP2k/CorpConnect/commit/cc484cbf8aba7bc2baf5e59e73684dc4016b3c09))

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
