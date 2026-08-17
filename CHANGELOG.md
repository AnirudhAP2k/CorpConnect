# [1.30.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.29.0...v1.30.0) (2026-08-17)


### Bug Fixes

* **auth:** replace react-icons with lucide-react and inline SVG in Social ([fe62872](https://github.com/AnirudhAP2k/CorpConnect/commit/fe62872af1def1ea79b824241f91303aaa6f63c9))
* **auth:** replace react-icons with lucide-react in ErrorCard ([7d81ab0](https://github.com/AnirudhAP2k/CorpConnect/commit/7d81ab03a3370cb241cbc50b9a17a960976878f3))
* **config:** update serverExternalPackages and sentry configuration ([c3e0eea](https://github.com/AnirudhAP2k/CorpConnect/commit/c3e0eea6218c285d663b598a4890ac027f38de43))
* **deps:** update pnpm lockfile ([7ce40c1](https://github.com/AnirudhAP2k/CorpConnect/commit/7ce40c159a0ac2e3a912978fa9bb71c976ca2c36))
* **ui:** replace react-icons with lucide-react in FormErrors ([6f9a352](https://github.com/AnirudhAP2k/CorpConnect/commit/6f9a352b9f4c8151f89902350642ee7433ae67c4))
* **ui:** replace react-icons with lucide-react in FormSuccess ([e75f82f](https://github.com/AnirudhAP2k/CorpConnect/commit/e75f82faa57d604706b7ee31a92cc51e0ac837e1))


### Features

* **deps:** add bundle-analyzer and remove unused react-icons ([5707c9f](https://github.com/AnirudhAP2k/CorpConnect/commit/5707c9f0c2848c48e36c5827cb7291759a339e84))

# [1.29.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.28.0...v1.29.0) (2026-08-17)


### Bug Fixes

* **admin:** update webhookUrl type in AdminTemplateRow to accept null ([c593733](https://github.com/AnirudhAP2k/CorpConnect/commit/c5937338e46692447ae1a04e448db95a250633b5))
* **ai-service:** update authentication middleware for webhook routes ([334c2f6](https://github.com/AnirudhAP2k/CorpConnect/commit/334c2f6ca8acadcbf0e5f6076b61ce86923e7fed))
* **automation:** fix prefer-const error in automation actions ([dd56b67](https://github.com/AnirudhAP2k/CorpConnect/commit/dd56b679b65bf4b39eb67f6bc5823753f04a4c26))
* **automation:** prevent synchronous setState inside useEffect ([dcd9104](https://github.com/AnirudhAP2k/CorpConnect/commit/dcd9104dfcb482b023c99418072811ea610dfc44))
* **config:** add ignoreDuringBuilds to next.config.ts ([f5f273f](https://github.com/AnirudhAP2k/CorpConnect/commit/f5f273f532d8e509870a2d0491c71b382454b174))
* **docker:** update docker ignore patterns for build efficiency ([9ff5cac](https://github.com/AnirudhAP2k/CorpConnect/commit/9ff5cac3d9d6b3cf7069e8e43557c8505a95b68d))


### Features

* **actions:** add automation rule management server actions ([bd42920](https://github.com/AnirudhAP2k/CorpConnect/commit/bd42920d7b72548d41c018fc2124538ee76fa073))
* **actions:** update admin management server actions ([7a8aa5e](https://github.com/AnirudhAP2k/CorpConnect/commit/7a8aa5eb0b9fec9d71a6e88c0ce6066a9ff6c591))
* **admin:** add admin automations management page route ([a33e023](https://github.com/AnirudhAP2k/CorpConnect/commit/a33e02362187d45174993bb16202d79203ad77d0))
* **admin:** add AdminAutomationsClient component ([fd07658](https://github.com/AnirudhAP2k/CorpConnect/commit/fd07658c54d658d13d27aed449ad080d554cc946))
* **admin:** add automations link to admin navigation layout ([6eefa22](https://github.com/AnirudhAP2k/CorpConnect/commit/6eefa22896cf22c60b3291966495f1a3ec0593ff))
* **ai-service:** add webhook and LLM configuration settings ([843a16b](https://github.com/AnirudhAP2k/CorpConnect/commit/843a16b033479d09c03022d37fd3763a43b1f1fb))
* **ai-service:** add webhook trigger router ([9a9c1b2](https://github.com/AnirudhAP2k/CorpConnect/commit/9a9c1b20b11e64d6509e59e2c067620b6f8b64b6))
* **ai-service:** add YAML prompt template for n8n evaluate_condition task ([de3e170](https://github.com/AnirudhAP2k/CorpConnect/commit/de3e170394efb085200ac98825720a58b19d5a1f))
* **ai-service:** add YAML prompt template for n8n freeform task ([1e48092](https://github.com/AnirudhAP2k/CorpConnect/commit/1e4809220a5ea2f25642413a4eddc62f9cb3d65f))
* **ai-service:** add YAML prompt template for n8n generate_email task ([730c619](https://github.com/AnirudhAP2k/CorpConnect/commit/730c619e8175ffca521769c57756cb095b8a94f7))
* **ai-service:** load n8n webhook system prompts from YAML templates ([590ab5a](https://github.com/AnirudhAP2k/CorpConnect/commit/590ab5a03f9970a8a54c5697e3c595fe47a6f929))
* **ai-service:** register webhook router in FastAPI app ([6fbdc81](https://github.com/AnirudhAP2k/CorpConnect/commit/6fbdc81e2d8ce21fcb1fe1c98f5beda7b0abb3bb))
* **ai-service:** update AI service environment variable examples ([92f0715](https://github.com/AnirudhAP2k/CorpConnect/commit/92f071548a795f4c5a7c136a12f583c48bd9999b))
* **ai-service:** update LLM provider integration engine ([f956514](https://github.com/AnirudhAP2k/CorpConnect/commit/f9565140ea41e18b4a34090af3b9fd85d1ba9150))
* **automation:** add AddRuleSheet component for rule creation ([d27511c](https://github.com/AnirudhAP2k/CorpConnect/commit/d27511c4a6bd35d60d14a16339ef07d1181ef825))
* **automation:** add AutomationRulesPanel component ([3b7104b](https://github.com/AnirudhAP2k/CorpConnect/commit/3b7104b504446642edf0cfb42af2d40d183b1116))
* **automation:** add catalog workflow template picker and toast notifications to AddRuleSheet ([1e8394c](https://github.com/AnirudhAP2k/CorpConnect/commit/1e8394c774f2ed2a206efa383292a40d0a356e7d))
* **automation:** render template names and integrate sonner toasts in AutomationRulesPanel ([1a0e945](https://github.com/AnirudhAP2k/CorpConnect/commit/1a0e945be789d6e5461a81fa0c75b4a27e503ad8))
* **config:** update environment variable examples ([a10a79c](https://github.com/AnirudhAP2k/CorpConnect/commit/a10a79cc7659a53ac5ee50c984f1f809ebd321bc))
* **db:** add automation rules and workflow template seed data ([9b9497f](https://github.com/AnirudhAP2k/CorpConnect/commit/9b9497fc87063cd96e4688139261f0890336e4c1))
* **db:** add migration SQL for automation rules and workflow templates ([c4a5f1d](https://github.com/AnirudhAP2k/CorpConnect/commit/c4a5f1dcca737ce106604a88a3e9dda6f42570f9))
* **db:** update schema with automation rules and workflow templates ([bcca92a](https://github.com/AnirudhAP2k/CorpConnect/commit/bcca92a8b10719a72f615b078dd3f59ec4d97008))
* **docs:** add LLM integration suggestions documentation ([fdbadff](https://github.com/AnirudhAP2k/CorpConnect/commit/fdbadff273f6a1f73fd1edff60f22a5caf3330cd))
* **docs:** add n8n agentic workflow implementation plan ([02e9756](https://github.com/AnirudhAP2k/CorpConnect/commit/02e9756b00eaca38546d606ee634c18c91612251))
* **docs:** add n8n architecture and workflow specification ([9102854](https://github.com/AnirudhAP2k/CorpConnect/commit/9102854b2ff48ede91b64bf214add578d0637b65))
* **docs:** add n8n workflow template JSON definitions ([1237014](https://github.com/AnirudhAP2k/CorpConnect/commit/1237014f63ed522d80f6b743e8bb86d8a9a278be))
* **docs:** update LLM integration task checklist ([ef234ad](https://github.com/AnirudhAP2k/CorpConnect/commit/ef234adeb1624121a36169ae026ce4e179acbdfb))
* **docs:** update organization verification documentation ([ee18a1d](https://github.com/AnirudhAP2k/CorpConnect/commit/ee18a1de0651efe0b2fe87ea8037539c0222a69e))
* **docs:** update phase 5 implementation plan documentation ([4ec580c](https://github.com/AnirudhAP2k/CorpConnect/commit/4ec580c52309f34b0fe0bd03702a1172e389266e))
* **events:** trigger automation rules on event publication ([5ab1f63](https://github.com/AnirudhAP2k/CorpConnect/commit/5ab1f639c8e024a6e664ef8411925106e3c2cdea))
* **jobs:** add automation rule execution background job ([eeaa6da](https://github.com/AnirudhAP2k/CorpConnect/commit/eeaa6da2068616191f815d339db68e6012baccbb))
* **jobs:** add n8n workflow trigger background job ([fff58f2](https://github.com/AnirudhAP2k/CorpConnect/commit/fff58f288cb6747dd81ae8697975e3c0a14d5b0e))
* **jobs:** add organization webhook delivery background job ([368eca1](https://github.com/AnirudhAP2k/CorpConnect/commit/368eca16ebdf1716fdd26569e847e6779b235b02))
* **jobs:** support template webhook URL and prompt fallback resolution in n8n trigger ([617083f](https://github.com/AnirudhAP2k/CorpConnect/commit/617083f4641f99b3083fc7da04431d26d1d9c707))
* **validation:** add automation rule Zod validation schemas ([6193656](https://github.com/AnirudhAP2k/CorpConnect/commit/619365695f124b2aec14065262e4623bee329d9a))

# [1.28.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.27.0...v1.28.0) (2026-08-14)


### Features

* **billing:** add billing domain query functions ([65a3bf4](https://github.com/AnirudhAP2k/CorpConnect/commit/65a3bf4a0ef0acc2ae93d65a29f46a177763abb4))
* **billing:** export billing queries and service in domain public contract ([22084d8](https://github.com/AnirudhAP2k/CorpConnect/commit/22084d8a99e3f189bc26ec5eb622fd601e441f5d))
* **billing:** update billing page to consume domain queries ([b2216ff](https://github.com/AnirudhAP2k/CorpConnect/commit/b2216ff0b786f324f264073a56ac54321d07e45d))
* **billing:** update billing service layer methods ([7db9661](https://github.com/AnirudhAP2k/CorpConnect/commit/7db96610168dc7744cba9f6b8a4440bfed7646f0))
* **dashboard:** refactor dashboard page data fetching to use domain queries ([0180b4e](https://github.com/AnirudhAP2k/CorpConnect/commit/0180b4ee43f56fb4f06acdcbab3dde543c40f243))
* **events:** add event queries for detailed page rendering ([918e818](https://github.com/AnirudhAP2k/CorpConnect/commit/918e8185fa0e69bb0fb31fb5dfbbf25d4497aac2))
* **events:** export event queries and actions in domain index ([9fe2143](https://github.com/AnirudhAP2k/CorpConnect/commit/9fe2143f86f1a97f240bf7ec550a870d4e72073d))
* **events:** refactor event details page to use domain queries ([0c5de19](https://github.com/AnirudhAP2k/CorpConnect/commit/0c5de19867420a8ad73dc398277d92cd9df16aa6))
* **events:** refactor payment success page with domain queries ([f87a9dd](https://github.com/AnirudhAP2k/CorpConnect/commit/f87a9dd75bfc2f12423e4c0129c126566b7ae5df))
* **events:** refactor root invite token page with domain queries ([9f4f561](https://github.com/AnirudhAP2k/CorpConnect/commit/9f4f561d7d820b42b1a6e357983de5811d8137b2))
* **events:** update event creation page options fetching with domain queries ([2912bcc](https://github.com/AnirudhAP2k/CorpConnect/commit/2912bcccf5d46017eb0433a49a824b78218d7972))
* **events:** update event invitation page to consume domain queries ([16edbfa](https://github.com/AnirudhAP2k/CorpConnect/commit/16edbfac5237d923cc557e8f1745d08b8f85b522))
* **events:** update event report page data fetching to use domain queries ([4da6c65](https://github.com/AnirudhAP2k/CorpConnect/commit/4da6c6511d528e0c66f3bb6a40c9d429d39afcd4))
* **events:** update event server actions for domain logic ([8b3e940](https://github.com/AnirudhAP2k/CorpConnect/commit/8b3e940f7c4dc0cc8e5b10dac530c89346fe45b2))
* **events:** update virtual room page data fetching with domain queries ([6cc9c56](https://github.com/AnirudhAP2k/CorpConnect/commit/6cc9c56a2e9387cc35660e531762e0b1fda5292f))
* **groups:** refactor group detail page to consume domain queries ([1d361fc](https://github.com/AnirudhAP2k/CorpConnect/commit/1d361fc4bc1023a98bed0d7686b884a4a92ead34))
* **groups:** refactor groups discovery page to consume domain queries ([3d53278](https://github.com/AnirudhAP2k/CorpConnect/commit/3d532784a6ddfa1a5d0bd0ac196a43b6d06be006))
* **invitations:** refactor invitations page data fetching to use domain queries ([7a1f713](https://github.com/AnirudhAP2k/CorpConnect/commit/7a1f71308f8754f6065c874dcb25279993c09a09))
* **messaging:** add messaging domain query functions ([d86cee9](https://github.com/AnirudhAP2k/CorpConnect/commit/d86cee9af7b97316bca27c8a6dd38a49887ca7e9))
* **messaging:** export messaging domain queries and actions ([9d062ae](https://github.com/AnirudhAP2k/CorpConnect/commit/9d062aec4d50966d0d895b6ded3e1d06b8cdd296))
* **messaging:** refactor direct conversation page to consume domain queries ([e0a61d8](https://github.com/AnirudhAP2k/CorpConnect/commit/e0a61d8ffd61f69e22d9f546161d1d5d3f14f42f))
* **messaging:** refactor group conversation page to consume domain queries ([1d7eee1](https://github.com/AnirudhAP2k/CorpConnect/commit/1d7eee144678203c5b90a93d0ef9aade6a4f437a))
* **messaging:** update messaging server actions for domain logic ([2fb0dbc](https://github.com/AnirudhAP2k/CorpConnect/commit/2fb0dbca56d96ad4bb05b55b981d78b093047163))
* **organizations:** add organization query functions for domain layer ([fff65b9](https://github.com/AnirudhAP2k/CorpConnect/commit/fff65b9194d424030600d3c85a5d45bc17348fa2))
* **organizations:** export organization queries and actions in domain index ([894eeda](https://github.com/AnirudhAP2k/CorpConnect/commit/894eeda3a9e369c980b48a9fe1a42dc3fdd69e85))
* **organizations:** refactor organization details page with domain queries ([e3269d3](https://github.com/AnirudhAP2k/CorpConnect/commit/e3269d3c30318fcec961e783003f42b4824cfd90))
* **organizations:** update AI planner page data fetching to use domain queries ([2e270d8](https://github.com/AnirudhAP2k/CorpConnect/commit/2e270d80a33452d7d2042ef0124555934e1e4911))
* **organizations:** update complete verification page with domain queries ([b06865e](https://github.com/AnirudhAP2k/CorpConnect/commit/b06865ec6f07b5f12808bea3ebb8801bba69a617))
* **organizations:** update organization discovery page to consume domain queries ([3bc6218](https://github.com/AnirudhAP2k/CorpConnect/commit/3bc62184149c941985f3b58bee4cca67b8b169cd))
* **organizations:** update organization events tab page with domain queries ([d7147f7](https://github.com/AnirudhAP2k/CorpConnect/commit/d7147f7ba07207123dc9c2f9ad66d52702f3d32a))
* **organizations:** update organization server actions ([cf208b5](https://github.com/AnirudhAP2k/CorpConnect/commit/cf208b5e650dabe5922d6867b4b94dbab421bd3c))
* **pitches:** add pitch domain queries for pitch management ([f5f879d](https://github.com/AnirudhAP2k/CorpConnect/commit/f5f879df6cfbad9926d9e0d7608d2a5d0e5a9e9b))
* **pitches:** export pitch queries in domain index ([8da919a](https://github.com/AnirudhAP2k/CorpConnect/commit/8da919a9ca64e9a92defecdba4b2156f5f1fd279))
* **pitches:** update organization pitches page with domain queries ([59416bf](https://github.com/AnirudhAP2k/CorpConnect/commit/59416bf00a90d6699b2bc2e6a971d3c8b0cd48fa))
* **pitches:** update pitch detail page data fetching to use domain queries ([89dfa06](https://github.com/AnirudhAP2k/CorpConnect/commit/89dfa06098a672979cc1b8a3af0f63c3e3339e5a))
* **pitches:** update pitch tasks page data fetching with domain queries ([cbd8a83](https://github.com/AnirudhAP2k/CorpConnect/commit/cbd8a8345b10a6c2d090957f35b0a70bd5b2ab7c))
* **tags:** add tag query functions for domain layer ([13859b2](https://github.com/AnirudhAP2k/CorpConnect/commit/13859b2e862e866d9a1c9cb820f843786b4ff344))
* **tags:** export tag queries in domain index ([5cd708e](https://github.com/AnirudhAP2k/CorpConnect/commit/5cd708ed886ff6a741e6e17eeaa023502986d9d0))

# [1.27.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.26.0...v1.27.0) (2026-08-04)


### Bug Fixes

* **header:** fixed the TopHeader to display the user image or avatar as a placeholder ([f97a711](https://github.com/AnirudhAP2k/CorpConnect/commit/f97a711d906896a1e6e67842b5a69c5f9b0238c9))


### Features

* **ai-service:** add HuggingFace model configuration settings ([fbdb73a](https://github.com/AnirudhAP2k/CorpConnect/commit/fbdb73a07e8b69ff9c664a5e3ff6c4ddb8733836))
* **ai-service:** add uptime tracking to AI service health check endpoint ([23f3f9c](https://github.com/AnirudhAP2k/CorpConnect/commit/23f3f9c6221b36290988d6ea0277e4d1f792c952))
* **ai-service:** reference HuggingFace settings in embeddings generator ([47d02a3](https://github.com/AnirudhAP2k/CorpConnect/commit/47d02a342bd2d8038e0d09654ca5a5c2a85688e0))
* **db:** add migration SQL for user profile fields ([bff1c4d](https://github.com/AnirudhAP2k/CorpConnect/commit/bff1c4d8c1a3f62e369ee0b2fd6fb0e283a88c3a))
* **db:** add user profile fields to Prisma schema ([8d84746](https://github.com/AnirudhAP2k/CorpConnect/commit/8d8474679b8b293978f121cd267b00142749a49a))
* **lv-service:** add uptime tracking to LiveKit service health check endpoint ([14256cf](https://github.com/AnirudhAP2k/CorpConnect/commit/14256cfbf3cc11c4cd6e23c8da158d3cfdb32f41))
* **profile:** add avatar assets ([bbfe13e](https://github.com/AnirudhAP2k/CorpConnect/commit/bbfe13e2c20eb5cfc257a1388bebdea9550dc964))
* **profile:** add profile edit page ([411b52f](https://github.com/AnirudhAP2k/CorpConnect/commit/411b52f613977e457e7c4a8527ddb413e9bee609))
* **profile:** add profile image optimization utility ([9361542](https://github.com/AnirudhAP2k/CorpConnect/commit/93615422cf39aa89aa85f191b1db8275890cc536))
* **profile:** add profile UI components ([c52e02e](https://github.com/AnirudhAP2k/CorpConnect/commit/c52e02ee7ff591bda4eb569f5fb57fc745902f93))
* **profile:** add profile URL formatting helper ([f0e68b0](https://github.com/AnirudhAP2k/CorpConnect/commit/f0e68b0c204fdf11cb8062f1e86a3cb7d70ada8f))
* **profile:** add ProfileActionsMenu component for profile options ([077b164](https://github.com/AnirudhAP2k/CorpConnect/commit/077b164a3eb5663184c7bb60e54a3914f7d773ff))
* **profile:** add public member profile page route with SEO metadata and share actions ([2a60d8d](https://github.com/AnirudhAP2k/CorpConnect/commit/2a60d8df0abf033b82e6a1a2ac5e19a0240a2f47))
* **profile:** added public profile page for public route prefix ([fcb62a7](https://github.com/AnirudhAP2k/CorpConnect/commit/fcb62a7321d7012f7e964bafbb40c0b199fe4d5f))
* **profile:** update profile edit page data fetching with Server Actions ([d903e0c](https://github.com/AnirudhAP2k/CorpConnect/commit/d903e0cdebd67a410f902f6ad6bbf177a4abdc7b))
* **profile:** update profile page layout ([1a4fbd3](https://github.com/AnirudhAP2k/CorpConnect/commit/1a4fbd34686aa5c981d29f3c5b9fd06a9bd126be))
* **profile:** update ProfileEditForm with bio location social links and avatar selector ([e3258c9](https://github.com/AnirudhAP2k/CorpConnect/commit/e3258c9725df2548fdb5d03458597706df373e8c))
* **profile:** update protected profile page with headline bio and activity widgets ([117a88a](https://github.com/AnirudhAP2k/CorpConnect/commit/117a88a83664b34ac82e4e9d38c0365b77d87619))
* **upload:** add file uploader module ([8f8708e](https://github.com/AnirudhAP2k/CorpConnect/commit/8f8708eedde0075771a190c49eda5c0e21e03629))
* **upload:** add upload server actions ([265e629](https://github.com/AnirudhAP2k/CorpConnect/commit/265e629769f9120060381d676fc17ed1212eb251))
* **users:** add headline bio location and social URL types to PublicUser ([910dac5](https://github.com/AnirudhAP2k/CorpConnect/commit/910dac56ea730bcdbd9e5ba8efc4d2e3ab5ec58a))
* **users:** add public profile and edit profile query functions ([8554074](https://github.com/AnirudhAP2k/CorpConnect/commit/8554074c3f80e2debbeed43a27a1b2ee5452c21c))
* **users:** add updateUserProfile Server Action for bio location and social links ([5c23d30](https://github.com/AnirudhAP2k/CorpConnect/commit/5c23d30a93f5eb81b971265bc0a716206992cf4d))
* **users:** add user profile schema validation for headline bio location and social links ([5c08183](https://github.com/AnirudhAP2k/CorpConnect/commit/5c081832a408ae927618ecacbaae12b64e0b1a68))
* **users:** export public profile query and edit profile functions ([044c846](https://github.com/AnirudhAP2k/CorpConnect/commit/044c84672b0b29a1b0c4881075108ba5c178d24a))
* **users:** update user actions for profile updates ([60e54f9](https://github.com/AnirudhAP2k/CorpConnect/commit/60e54f968a7587dfb91309fcfe3217d436b31cea))
* **users:** update user validation schemas ([921c988](https://github.com/AnirudhAP2k/CorpConnect/commit/921c988ba89f4e689b32682c8e19dfaeae33df7d))
* **ws-service:** add uptime tracking to WebSocket service health check endpoint ([1cd2ade](https://github.com/AnirudhAP2k/CorpConnect/commit/1cd2adeaa10f06cc0508cbbb543ff885b388283b))

# [1.26.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.25.1...v1.26.0) (2026-07-30)


### Bug Fixes

* **payment:** update Stripe API version compatibility string ([c9e36de](https://github.com/AnirudhAP2k/CorpConnect/commit/c9e36de30f7a581163b8113eabed8830a5a268fa))
* **payment:** update Stripe API version to 2026-06-24 ([5843792](https://github.com/AnirudhAP2k/CorpConnect/commit/5843792b5344f2e6f493d7106e2982d7b43cb003))


### Features

* **auth:** extract calculatePasswordStrength into utils helper in RegisterForm ([b75a080](https://github.com/AnirudhAP2k/CorpConnect/commit/b75a0804265078ef9aa49a44aa1eec3fa8f1d958))
* **utils:** add calculatePasswordStrength utility helper ([6a354c7](https://github.com/AnirudhAP2k/CorpConnect/commit/6a354c71fffce440892c7f887bcf596c9d3274d6))

## [1.25.1](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.25.0...v1.25.1) (2026-07-30)


### Bug Fixes

* **auth:** resolve icon overlap, layout shift on password bar, and incorrect strength algorithm ([1b922a8](https://github.com/AnirudhAP2k/CorpConnect/commit/1b922a816c131d775023e72da6f1c05f469a8395))

# [1.25.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.24.0...v1.25.0) (2026-07-30)


### Features

* **auth:** upgrade LoginForm with input icons, password visibility toggles, and executive CTA styling ([ce19c14](https://github.com/AnirudhAP2k/CorpConnect/commit/ce19c14abd21c543030dac9c53785ebd3b886f7a))
* **auth:** upgrade RegisterForm with Stitch input icons, password strength indicator, and terms checkbox ([d7905c9](https://github.com/AnirudhAP2k/CorpConnect/commit/d7905c9c27f6bb49762fbf96fc99aa0f81fbabfb))

# [1.24.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.23.0...v1.24.0) (2026-07-29)


### Bug Fixes

* **ai-service:** add container origin to CORS allowed origins ([5a67169](https://github.com/AnirudhAP2k/CorpConnect/commit/5a67169140403b9bd848de2509cb2b630dba30cf))
* **ai-service:** switch tenant api key hashing to sha256 constant time compare ([2522f9b](https://github.com/AnirudhAP2k/CorpConnect/commit/2522f9b320f280e2ce8eb5a0c80428dc23cd6b53))
* **ai:** add organization permission check to brainstorm brief route ([58fb74a](https://github.com/AnirudhAP2k/CorpConnect/commit/58fb74a2aa6c18b4b885c312781b1d64c81a079c))
* **ai:** add organization permission check to brainstorm message route ([0c6feeb](https://github.com/AnirudhAP2k/CorpConnect/commit/0c6feebfab107c591c9078eb541a55778a12d573))
* **auth:** enforce rate limiting on login endpoint ([a81ee5b](https://github.com/AnirudhAP2k/CorpConnect/commit/a81ee5b92f1e1961a6f96182dd10a65f1c40e264))
* **auth:** enforce rate limiting on password reset endpoint ([9015cc9](https://github.com/AnirudhAP2k/CorpConnect/commit/9015cc9576b23be59d5d3d1284e09f38d6c7d61a))
* **auth:** enforce rate limiting on registration endpoint ([70f548c](https://github.com/AnirudhAP2k/CorpConnect/commit/70f548cc7c2a54eeef64a0fed73414dd6cae4f5b))
* **auth:** remove emoji and update font class to font-headline ([514d8e6](https://github.com/AnirudhAP2k/CorpConnect/commit/514d8e6ee608fd632c643a60364351bf7a54e3ce))
* **auth:** replace fabricated static stats with honest feature highlights on Login page ([1c92860](https://github.com/AnirudhAP2k/CorpConnect/commit/1c92860df5c320775e1449e3e78544e33e346134))
* **auth:** sanitize returnTo parameter to prevent open redirect vulnerabilities ([f28e7e9](https://github.com/AnirudhAP2k/CorpConnect/commit/f28e7e9cb1474f93b51b8acb55b6d34b6ae2e22d))
* **dashboard:** remove caller user id requirement from pitch review component ([c4b2ee8](https://github.com/AnirudhAP2k/CorpConnect/commit/c4b2ee85c9e954203cdbae12905b87c0064b49aa))
* **dashboard:** replace emoji with Shield icon on admin console button ([1bdbc44](https://github.com/AnirudhAP2k/CorpConnect/commit/1bdbc44141eee0a17072644bc5ea5b778e3c6a62))
* **docker:** update nextjs service url configuration in production compose ([1afb29b](https://github.com/AnirudhAP2k/CorpConnect/commit/1afb29baed5633be85b012b7fe3069eb4b52dd71))
* **docker:** update service network urls in dev compose ([8758b37](https://github.com/AnirudhAP2k/CorpConnect/commit/8758b379db1f311a852b0fc8b06b45f61c3b014d))
* **events:** replace native alert with sonner toast and use router.refresh ([a325da6](https://github.com/AnirudhAP2k/CorpConnect/commit/a325da6f3891cd24f2c80ab0fa81866125b5fc23))
* **events:** require owner or admin role for event creation ([a27cdb1](https://github.com/AnirudhAP2k/CorpConnect/commit/a27cdb12a1ba953d35339b7d36115c750ff10bae))
* **feedback:** replace celebration emoji with CheckCircle2 icon ([42df8ac](https://github.com/AnirudhAP2k/CorpConnect/commit/42df8ac507453572eaf2a40bdd87008df0a2d207))
* **header:** temporarily hide ThemeToggle until demo-path migration completes ([9a98533](https://github.com/AnirudhAP2k/CorpConnect/commit/9a98533bd40b3d926c43cb8c5e980ac6856d7258))
* **lv-service:** authorize event participant or host access for rooms ([87a973c](https://github.com/AnirudhAP2k/CorpConnect/commit/87a973c98245cdcf55531c0b8da97e2906d5c6aa))
* **marketing:** fix broken signup links on About page ([56fcd88](https://github.com/AnirudhAP2k/CorpConnect/commit/56fcd88206e52e8085cb5fc5a57abf4589ce72d3))
* **marketing:** update Contact Sales CTA link to point to contact route ([1b62e05](https://github.com/AnirudhAP2k/CorpConnect/commit/1b62e05d576612ac63d20ef3d79088c4c114ad9c))
* **marketing:** update homepage CTA links and replace search placeholder ([a012d11](https://github.com/AnirudhAP2k/CorpConnect/commit/a012d11395187b46d7291e89724b1515e8f20023))
* **navigation:** update footer links to active marketing and auth routes ([e55a2cf](https://github.com/AnirudhAP2k/CorpConnect/commit/e55a2cf5e1918ea54ca90952852238cef648628f))
* **next:** add import-in-the-middle to transpilePackages ([c678997](https://github.com/AnirudhAP2k/CorpConnect/commit/c6789974b9d4a7f797079f622681a2af7f08bb9f))
* **onboarding:** remove emoji from welcome title ([13398a8](https://github.com/AnirudhAP2k/CorpConnect/commit/13398a88f559bc9948c21ba7fcb9b93bc628117c))
* **org-documents:** restrict document fetching to owner and admin roles ([6a43784](https://github.com/AnirudhAP2k/CorpConnect/commit/6a43784d87a2362dad0b6dc4a68a9f7749eaa47b))
* **organizations:** enforce organization id matching on member updates and removals ([fac1f48](https://github.com/AnirudhAP2k/CorpConnect/commit/fac1f48b8803edce3daa0aabb19191e3d766b8ce))
* **package:** add import-in-the-middle pnpm override ([8388ee5](https://github.com/AnirudhAP2k/CorpConnect/commit/8388ee569bca39b8d87d79945c533338592c407b))
* **package:** update lockfile for pnpm overrides ([3f418c0](https://github.com/AnirudhAP2k/CorpConnect/commit/3f418c0879f3aac301810d4a82b5cf4e7d2d36ae))
* **pitches:** authenticate pitch actions using server session ([290baf4](https://github.com/AnirudhAP2k/CorpConnect/commit/290baf47f3d5f75e460bcde5ca61abd3031c60e3))
* **pitches:** derive user identity from session in pitch brief modal ([357ef46](https://github.com/AnirudhAP2k/CorpConnect/commit/357ef4649c462ae4550573a4012dd5518b0d086b))
* **pitches:** remove emoji from approved pitch status badge ([eb54bb5](https://github.com/AnirudhAP2k/CorpConnect/commit/eb54bb55db83f2b2fd98a4535988f77fe721b4c8))
* **pitches:** remove emoji from pitch saved modal title ([bca990f](https://github.com/AnirudhAP2k/CorpConnect/commit/bca990fa29280ba33042a27ffb29168b06df1310))
* **upload:** add auth check and exclude svg from image uploads ([cb7ca89](https://github.com/AnirudhAP2k/CorpConnect/commit/cb7ca898745c95d775aef896c960d47fc7eb77fc))
* **ws-service:** authorize room membership for virtual event websocket events ([454c6b0](https://github.com/AnirudhAP2k/CorpConnect/commit/454c6b08d80b8e40ee2d2d53a2e73067037d78b2))


### Features

* **ai-planner:** add navigation link to organization pitches ([cb9b153](https://github.com/AnirudhAP2k/CorpConnect/commit/cb9b1539f8ac4390ab6c697368524d4031156999))
* **ai:** integrate AI server action handlers with domain layer ([0763b95](https://github.com/AnirudhAP2k/CorpConnect/commit/0763b9513d8444b0b09c9b8d9f79608fb92e6d16))
* **api:** add system health check endpoint ([31efd0b](https://github.com/AnirudhAP2k/CorpConnect/commit/31efd0bb83cba0ba1dabdece2b3a84b693af0139))
* **api:** update admin organization verification route handler ([57046e7](https://github.com/AnirudhAP2k/CorpConnect/commit/57046e7cab027f82321bb666846a70e244e10ec7))
* **api:** update background job trigger API endpoint ([695f129](https://github.com/AnirudhAP2k/CorpConnect/commit/695f129837ee490fe504d0d971365c29c701db5c))
* **auth:** add auth validation helper utilities ([fe1ac2e](https://github.com/AnirudhAP2k/CorpConnect/commit/fe1ac2ecb2ef92fb58011e32b845eb5a716358d7))
* **auth:** update Auth.js configuration for JWT and RBAC callbacks ([11f25c1](https://github.com/AnirudhAP2k/CorpConnect/commit/11f25c1a549be69dc509a4d71a8d7b0010d44ba5))
* **auth:** update NextAuth initialization and session helpers ([fe23629](https://github.com/AnirudhAP2k/CorpConnect/commit/fe236294427e292089efe252417c19ec69ceeabb))
* **brainstorm:** add pitch list navigation link to brainstorm chat ([96351d7](https://github.com/AnirudhAP2k/CorpConnect/commit/96351d75ec231d7b4b191b84020f5b28f0db8cd5))
* **brand:** add App Router vector SVG favicon and icon.png ([e83e77e](https://github.com/AnirudhAP2k/CorpConnect/commit/e83e77ec2f47509e2b8d6fc88c91f39be1acdb3b))
* **brand:** add Stitch-generated Login and Register split-screen background assets ([1319847](https://github.com/AnirudhAP2k/CorpConnect/commit/131984784b4892866bb1fd619c837d60f008c5ae))
* **brand:** add Stitch-generated master CorpConnect icon asset ([0b74f2e](https://github.com/AnirudhAP2k/CorpConnect/commit/0b74f2ed22410d6ca53f1e616e4ce427def105d2))
* **constants:** update application navigation and plan constants ([31d15a8](https://github.com/AnirudhAP2k/CorpConnect/commit/31d15a8f99603db80d75cec733be2db0c1d1f3d7))
* **db:** add comprehensive database seed script with mock entities ([54886bb](https://github.com/AnirudhAP2k/CorpConnect/commit/54886bb22569164b4587dd808dc458c62285e87b))
* **db:** add pgvector schema verification and smoke test database migrations ([d7ddfa1](https://github.com/AnirudhAP2k/CorpConnect/commit/d7ddfa14eacd4c5ad5d9ff308662e4c263d15926))
* **db:** update Prisma schema with pgvector extensions and index definitions ([02b0558](https://github.com/AnirudhAP2k/CorpConnect/commit/02b0558c6ffef74c444a0ce55c51f24b266a3604))
* **docker:** enable pgvector extension and indexes on startup ([6538ef2](https://github.com/AnirudhAP2k/CorpConnect/commit/6538ef2a429d95eb01f9c883210fdc091287dd07))
* **domain:** update AI domain actions and public exports ([9ea4414](https://github.com/AnirudhAP2k/CorpConnect/commit/9ea441449aa42926902f3d8da86295f6a1e97847))
* **domain:** update notifications domain server actions ([163592c](https://github.com/AnirudhAP2k/CorpConnect/commit/163592cb57dfb8bc7c01ffe4e3fa6bca7cbcdec7))
* **domain:** update organization domain server actions ([81b9c0b](https://github.com/AnirudhAP2k/CorpConnect/commit/81b9c0b707d7d68db3771263cf80fce2839bead1))
* **email:** add organization verification email template ([b7151f9](https://github.com/AnirudhAP2k/CorpConnect/commit/b7151f94f572f6bbc2f8619563369b7201ae9658))
* **hooks:** update useEventView custom hook ([ad96a84](https://github.com/AnirudhAP2k/CorpConnect/commit/ad96a841a37f1636665d93615eb99219d3c044cb))
* **hooks:** update useSocket custom hook ([3276001](https://github.com/AnirudhAP2k/CorpConnect/commit/3276001170c1005fa0f18da3349c8c22e3193e8f))
* **jobs:** add trial expiration background job ([c6145a9](https://github.com/AnirudhAP2k/CorpConnect/commit/c6145a9f839e78c14650538606e51364c7311689))
* **jobs:** update organization verification background job ([9f5d64c](https://github.com/AnirudhAP2k/CorpConnect/commit/9f5d64c7216f30293fcb75e4ac4a7ea7739542de))
* **lib:** update API authentication utilities ([074fe6d](https://github.com/AnirudhAP2k/CorpConnect/commit/074fe6dc19097be6652a49a1aad3cb8cb592a6e5))
* **marketing:** add Contact Sales & Request Demo page ([c7c71da](https://github.com/AnirudhAP2k/CorpConnect/commit/c7c71da4262b4a923d883910563c2a7230cc28dc))
* **marketing:** add Privacy Policy page ([964c946](https://github.com/AnirudhAP2k/CorpConnect/commit/964c946c8df9053d960a288a5ab6d5a6920ec532))
* **marketing:** add Terms of Service page ([050b179](https://github.com/AnirudhAP2k/CorpConnect/commit/050b179c78e7b060b7d237f473043e250dde4d63))
* **middleware:** add route protection and tenancy policy middleware handlers ([0f993c9](https://github.com/AnirudhAP2k/CorpConnect/commit/0f993c9c7b951f78487e8dfd43833e6c5ff3999f))
* **payment:** update Stripe payment utilities ([66d6ae9](https://github.com/AnirudhAP2k/CorpConnect/commit/66d6ae941b37a9237a43a3eaea14635156a9ff0f))
* **pitches:** add organization pitch detail page ([435b7ff](https://github.com/AnirudhAP2k/CorpConnect/commit/435b7ff60e8dbedf0d15265ed7f2fb64a606b059))
* **pitches:** add organization pitches listing page ([0d6f8a9](https://github.com/AnirudhAP2k/CorpConnect/commit/0d6f8a905a068b1775c5c9325dc37f8655d53c2f))
* **pitches:** add pitch detail view component ([d8b0447](https://github.com/AnirudhAP2k/CorpConnect/commit/d8b0447457062f50b6bfba889b1c899343d4362a))
* **rate-limit:** add lightweight fixed-window rate limiter ([86be046](https://github.com/AnirudhAP2k/CorpConnect/commit/86be046a0683c26e1c183086a70a3fc6d93f1939))
* **routes:** update route definition constants ([cf865ef](https://github.com/AnirudhAP2k/CorpConnect/commit/cf865ef601879ff98b07ba75356fea8f24fe7040))
* **scheduler:** update cron jobs scheduler ([a523e3a](https://github.com/AnirudhAP2k/CorpConnect/commit/a523e3a90250a33a0c7156b2e279c3894fb2f725))
* **scripts:** add admin privilege grant and pgvector enablement helper scripts ([8589f3b](https://github.com/AnirudhAP2k/CorpConnect/commit/8589f3b6ee79820dc7120a2dfa3aca22e8f1b4eb))
* **theme:** convert nx-* design tokens to theme-aware CSS custom properties ([dc950f3](https://github.com/AnirudhAP2k/CorpConnect/commit/dc950f3c3e4a7005f853c844da1161f326c1c8e9))
* **theme:** update Tailwind color tokens to reference CSS custom properties ([908329c](https://github.com/AnirudhAP2k/CorpConnect/commit/908329c290bc5414d2379f1828ae924dcc9bc49e))
* **tokens:** update token generation helpers ([f95c3aa](https://github.com/AnirudhAP2k/CorpConnect/commit/f95c3aaecd9b9d580072ded4b9d230b9669dba63))
* **validation:** update Zod validation schemas ([e842a44](https://github.com/AnirudhAP2k/CorpConnect/commit/e842a445dcac1430fe272af2bf6d8c0ee34c6e6b))

# [1.23.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.22.0...v1.23.0) (2026-07-23)


### Bug Fixes

* **ci:** enable automatic review, describe, and synchronize push triggers ([043692b](https://github.com/AnirudhAP2k/CorpConnect/commit/043692bdc9c89326475486f8afdd4bf878629837))
* **ci:** minor fix in fallback model for the pr agent review ([c0bc71d](https://github.com/AnirudhAP2k/CorpConnect/commit/c0bc71d62cd8a5db49afeab5be71b1dba850e6e3))
* **ci:** minor fix in fallback model to 2.5 flash for pr agent ([f8c8be8](https://github.com/AnirudhAP2k/CorpConnect/commit/f8c8be8fb6771ae6683bc695eb36ec26e4bd0a3b))
* **ci:** set google ai studio keys and model overrides for PR-Agent ([a74477a](https://github.com/AnirudhAP2k/CorpConnect/commit/a74477a04ffed069dc122f859917937a6a837bf8))
* **ci:** updated fallback model to 3.5 lite with max token ([cc3c37b](https://github.com/AnirudhAP2k/CorpConnect/commit/cc3c37bad5311ea323a26ab87d4c7ba25f70f4e9))
* **ci:** updated model for the pr agent review ([9f6926c](https://github.com/AnirudhAP2k/CorpConnect/commit/9f6926c2938527d9f8ac598eb9e8fe0f2776f002))


### Features

* **billing:** developed billing domain error file ([f3fbaa0](https://github.com/AnirudhAP2k/CorpConnect/commit/f3fbaa011ec52b8121d6c5b70af1608f10859e81))
* **billing:** developed billing domain gateway index ([be232a7](https://github.com/AnirudhAP2k/CorpConnect/commit/be232a7c7118a8eac66095c3ea8207d0a2ec8752))
* **billing:** developed billing domain gateway razorpay adapter ([ebc66a5](https://github.com/AnirudhAP2k/CorpConnect/commit/ebc66a548328a885bc941ab0f11fd150b300a1e5))
* **billing:** developed billing domain gateway stripe adapter ([64f8706](https://github.com/AnirudhAP2k/CorpConnect/commit/64f8706819da3c180d483e6acc18184767137c56))
* **billing:** developed billing domain gateway type defination ([62ed877](https://github.com/AnirudhAP2k/CorpConnect/commit/62ed87734643d32ebb4807e8a9609a9b9f9d2dec))
* **billing:** developed billing domain index logic ([6d2476c](https://github.com/AnirudhAP2k/CorpConnect/commit/6d2476c5a3a8d2d6128d39f8e94d75ae0972c578))
* **billing:** developed billing domain service logic ([a83d6c1](https://github.com/AnirudhAP2k/CorpConnect/commit/a83d6c13315fa7a0d32ea7c72a1e15000b21c801))
* **billing:** developed billing domain webhook logic ([b5c3dff](https://github.com/AnirudhAP2k/CorpConnect/commit/b5c3dff7c95dacf4b2735c51e40f78cda17ada72))
* **billing:** refactored portal api route to use billing domain ([0ecd4d1](https://github.com/AnirudhAP2k/CorpConnect/commit/0ecd4d12ade0ce86fcbb17ca5a76d5660052a516))
* **billing:** refactored razorpay webhook handler to use billing domain ([5f04020](https://github.com/AnirudhAP2k/CorpConnect/commit/5f040204b8de7da2fa660b5d55e88ad532d2a875))
* **billing:** refactored status api route to use billing domain ([bb758d7](https://github.com/AnirudhAP2k/CorpConnect/commit/bb758d7578bb8774afe57091c902a14daacdb08a))
* **billing:** refactored stripe webhook handler to use billing domain ([858c9d6](https://github.com/AnirudhAP2k/CorpConnect/commit/858c9d61ac3c3687f2ee2f6d5d129e2e4b14258a))
* **billing:** refactored subscribe api route to use billing domain ([15de0ae](https://github.com/AnirudhAP2k/CorpConnect/commit/15de0ae331023aec5104d5005e7f61c0fb63a689))
* **ci:** added pr-review agent ([03e7c59](https://github.com/AnirudhAP2k/CorpConnect/commit/03e7c591066e03653475f879d718c01c1feaf6bd))
* **test:** implemented billling gateway test case ([5096bf9](https://github.com/AnirudhAP2k/CorpConnect/commit/5096bf96a49bca39fa815cde45acc945abaee5e5))
* **test:** implemented billling service test case ([6367171](https://github.com/AnirudhAP2k/CorpConnect/commit/63671711391c5de0ea17be79c7e04dc900e9cf5b))
* **test:** implemented billling webhook test case ([66e3fce](https://github.com/AnirudhAP2k/CorpConnect/commit/66e3fcec21c820f126d20bdfb56204b0c960ed74))

# [1.22.0](https://github.com/AnirudhAP2k/CorpConnect/compare/v1.21.0...v1.22.0) (2026-07-23)


### Features

* **ai:** add brainstorm brief prompt template ([d15c8f0](https://github.com/AnirudhAP2k/CorpConnect/commit/d15c8f07970a28a671f8e50efe58c7156f176f99))
* **ai:** add brainstorm chat prompt template ([e78a947](https://github.com/AnirudhAP2k/CorpConnect/commit/e78a94760565bebfcf11eb8f2fa5a656688ff1b1))
* **ai:** add brainstorm tasklist prompt template ([9b8c9ce](https://github.com/AnirudhAP2k/CorpConnect/commit/9b8c9ce475f776fc98d91b7cd9c5a24c1c07e1b5))
* **ai:** add cached YAML prompt loader ([d62b1b1](https://github.com/AnirudhAP2k/CorpConnect/commit/d62b1b1ab6e2e985ff567e5ae1b648f88b57fdfb))
* **ai:** add concierge chat prompt template ([daf4bdc](https://github.com/AnirudhAP2k/CorpConnect/commit/daf4bdcd097fdb1faad7c69b4868a12b6c14ff30))
* **ai:** add description suggestions prompt template ([20cde96](https://github.com/AnirudhAP2k/CorpConnect/commit/20cde9652848e8eb4458021592f533cefaf388f9))
* **ai:** add event description prompt template ([60779ca](https://github.com/AnirudhAP2k/CorpConnect/commit/60779ca1e4002687718f55cef37c981206305995))
* **ai:** add event summary prompt template ([8620c0e](https://github.com/AnirudhAP2k/CorpConnect/commit/8620c0e2739cdb99bc46d1f7409796c4e547f3b4))
* **ai:** add matchmaking reason prompt template ([f290435](https://github.com/AnirudhAP2k/CorpConnect/commit/f29043505b047cceb57d153a1489fbfa660599a8))
* **ai:** add sentiment analysis prompt template ([36671dd](https://github.com/AnirudhAP2k/CorpConnect/commit/36671dd02b013965a5e8303b4ea681a4fe39e9be))
* **ai:** add YAML prompt dependency ([d5ae7e9](https://github.com/AnirudhAP2k/CorpConnect/commit/d5ae7e9206df80ce9299c093be890948154d03fa))
* **ai:** expose prompt template loader ([a850fd5](https://github.com/AnirudhAP2k/CorpConnect/commit/a850fd5a16d2af5cb2839fdcfb35a5325edd7016))
* **ai:** load analysis prompts from templates ([c4a5d4b](https://github.com/AnirudhAP2k/CorpConnect/commit/c4a5d4bd965c9486b938182132d1a3a77b544253))
* **ai:** load brainstorm prompts from templates ([574768e](https://github.com/AnirudhAP2k/CorpConnect/commit/574768eff7064d4ca460f5f519b281fdfc8f996e))
* **ai:** load concierge prompt from template ([2759365](https://github.com/AnirudhAP2k/CorpConnect/commit/2759365f09281c6add7e7261a530224447dd4b2c))
* **ai:** load generation prompts from templates ([838fc0c](https://github.com/AnirudhAP2k/CorpConnect/commit/838fc0c3266106c5e0c4a58f420de5806d08aa42))

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
