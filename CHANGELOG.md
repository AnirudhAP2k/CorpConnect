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
