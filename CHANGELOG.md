# Changelog

## [1.12.0](https://github.com/ayunis-core/ayunis-core/compare/v1.11.0...v1.12.0) (2026-02-27)


### Features

* add stackit as openai-compatible model provider ([#172](https://github.com/ayunis-core/ayunis-core/issues/172)) ([f4ca17f](https://github.com/ayunis-core/ayunis-core/commit/f4ca17f66f5dfa7a515ce09b8df0d687fd59aafd))
* **AYC-000:** add download-as-image button to chart widgets ([#274](https://github.com/ayunis-core/ayunis-core/issues/274)) ([7eec019](https://github.com/ayunis-core/ayunis-core/commit/7eec019ddd92a2d0017b75df654906a43f0e3ce5))
* **AYC-82:** add description hints for knowledge bases and skills ([#250](https://github.com/ayunis-core/ayunis-core/issues/250)) ([1f82859](https://github.com/ayunis-core/ayunis-core/commit/1f82859217a5e5f376d9caa5d5fd7955452c4f30))
* **AYC-82:** add marketplace integrations ([#171](https://github.com/ayunis-core/ayunis-core/issues/171)) ([074505b](https://github.com/ayunis-core/ayunis-core/commit/074505ba44e9a9314a11ddf4a5f508626f56e2d8))
* **AYC-82:** improve integration tool widget with item component ([#249](https://github.com/ayunis-core/ayunis-core/issues/249)) ([611690d](https://github.com/ayunis-core/ayunis-core/commit/611690dff8a5eb748552e484e8a650643a8fce1b))
* **AYC-93:** remove admin subscription management endpoints and billing UI ([#244](https://github.com/ayunis-core/ayunis-core/issues/244)) ([8a02a14](https://github.com/ayunis-core/ayunis-core/commit/8a02a14844596c345bcfbd825fceed29db943799))
* **AYC-94:** auto-install pre-installed marketplace skills on user creation ([#245](https://github.com/ayunis-core/ayunis-core/issues/245)) ([3822a1f](https://github.com/ayunis-core/ayunis-core/commit/3822a1ff177deaded06b02ae93cb1398b45612db))
* **AYC-95:** add feature toggle system for knowledge bases and skills ([#251](https://github.com/ayunis-core/ayunis-core/issues/251)) ([5e7a881](https://github.com/ayunis-core/ayunis-core/commit/5e7a8811d4f30dac14ff033aa74763bd63908495))
* **AYC-96:** add global user usage backend endpoint ([#262](https://github.com/ayunis-core/ayunis-core/issues/262)) ([a980a5a](https://github.com/ayunis-core/ayunis-core/commit/a980a5a33236951f1fd98f2d2ea8f46df8eb8397))
* **AYC-98:** add URL source UI to knowledge base detail page ([#266](https://github.com/ayunis-core/ayunis-core/issues/266)) ([e679179](https://github.com/ayunis-core/ayunis-core/commit/e679179b7e1d60bb49fa6a91282abccdbee76baf))
* **AYC-99:** add skill knowledge bases frontend UI with toggle card and renamed translations ([#271](https://github.com/ayunis-core/ayunis-core/issues/271)) ([9d00131](https://github.com/ayunis-core/ayunis-core/commit/9d0013133a78852df4ff3f5b59ef00b24b087f79))
* **chats:** hide agent filter dropdown when agents feature is disabled ([#286](https://github.com/ayunis-core/ayunis-core/issues/286)) ([a43a6cf](https://github.com/ayunis-core/ayunis-core/commit/a43a6cf10609f497c6033b80c95ea47101794f74))


### Bug Fixes

* **AYC-000:** allow emojis and unicode in skill name validation ([#261](https://github.com/ayunis-core/ayunis-core/issues/261)) ([e9f78ff](https://github.com/ayunis-core/ayunis-core/commit/e9f78ffdb227f92efd8cf08cd73b1e2e53c0b2f0))
* **AYC-000:** change anonymize base port to avoid macOS launchd conflict on 8021 ([#192](https://github.com/ayunis-core/ayunis-core/issues/192)) ([fd3ec49](https://github.com/ayunis-core/ayunis-core/commit/fd3ec49fa5c4a17cf9fd83de1c9139ea2c3ce434))
* **AYC-000:** copy message as rich text for proper formatting in word ([#273](https://github.com/ayunis-core/ayunis-core/issues/273)) ([527a962](https://github.com/ayunis-core/ayunis-core/commit/527a9622e1c3071db05f82f798cb28fa71b4385b))
* **AYC-000:** fail loudly when anonymization service is unavailable in anonymous mode ([#191](https://github.com/ayunis-core/ayunis-core/issues/191)) ([5d6d70c](https://github.com/ayunis-core/ayunis-core/commit/5d6d70cd5b93843d20e58dc637e89657ace516ac))
* **AYC-000:** fix runtime errors in thread/source mappers, remove hardcoded CORS, add backend-debugging skill, remove madge ([#189](https://github.com/ayunis-core/ayunis-core/issues/189)) ([e3ccdb3](https://github.com/ayunis-core/ayunis-core/commit/e3ccdb31de831fb8a2bca40437eae3c201fd112d))
* **AYC-000:** gate skills and internet search by feature toggle instead of deployment type ([#272](https://github.com/ayunis-core/ayunis-core/issues/272)) ([4736218](https://github.com/ayunis-core/ayunis-core/commit/473621800c1950d882d0b25a107ae0cd884aa597))
* **AYC-000:** increase max tokens for anthropic, bedrock, and mistral handlers ([#243](https://github.com/ayunis-core/ayunis-core/issues/243)) ([06143be](https://github.com/ayunis-core/ayunis-core/commit/06143be8e60d859a116cd009e76c5438d38d13ff))
* **AYC-000:** invalidate skill detail query on toggle active and pinned ([#259](https://github.com/ayunis-core/ayunis-core/issues/259)) ([0a9d558](https://github.com/ayunis-core/ayunis-core/commit/0a9d558ab80631f2a518addcc4d8bf6c93e0caf0))
* **AYC-000:** kill orphaned node processes on dev script restart ([#188](https://github.com/ayunis-core/ayunis-core/issues/188)) ([3946638](https://github.com/ayunis-core/ayunis-core/commit/39466388e92bbb7a00220eb10b8aafc0936fad3b))
* **AYC-000:** update stale port 8001 references to 8002 for anonymize service ([#198](https://github.com/ayunis-core/ayunis-core/issues/198)) ([b378807](https://github.com/ayunis-core/ayunis-core/commit/b378807754681f85535986f391c428c38ffb31b5))
* **AYC-000:** use StringValue type for jwt expiresIn config ([#258](https://github.com/ayunis-core/ayunis-core/issues/258)) ([a3e4047](https://github.com/ayunis-core/ayunis-core/commit/a3e404785e810e2ae9f59a058fb9fca7202d8658))
* **AYC-82:** return user context from beforeLoad instead of mutating ([#248](https://github.com/ayunis-core/ayunis-core/issues/248)) ([c27ba38](https://github.com/ayunis-core/ayunis-core/commit/c27ba38cb8897e608f0300398c4d712a6957505c))
* **AYC-90:** add access control and duplicate handling to skill activation ([#225](https://github.com/ayunis-core/ayunis-core/issues/225)) ([227152d](https://github.com/ayunis-core/ayunis-core/commit/227152ddadefaed92646735b9fd5b1bbfffd989a))
* **AYC-90:** fix infinite retry loop, stale pendingSkillId, and skill name desync ([#228](https://github.com/ayunis-core/ayunis-core/issues/228)) ([6aa1c3a](https://github.com/ayunis-core/ayunis-core/commit/6aa1c3abcb3d81dad16964ab827fda742ce72ed0))
* **AYC-90:** resolve isShared in extracted controllers and parallelize toggleActive ([#221](https://github.com/ayunis-core/ayunis-core/issues/221)) ([84bfaf8](https://github.com/ayunis-core/ayunis-core/commit/84bfaf8ad018591d434515dd8bf1805f16fa8e81))
* **AYC-90:** use RETURNING clause in toggleSkillPinned to eliminate TOCTOU gap ([#220](https://github.com/ayunis-core/ayunis-core/issues/220)) ([84d0f82](https://github.com/ayunis-core/ayunis-core/commit/84d0f82167490324b052efa111f0ebe9ce550646))
* **AYC-92:** add i18n translations for knowledge base tool call displays ([#246](https://github.com/ayunis-core/ayunis-core/issues/246)) ([c084c84](https://github.com/ayunis-core/ayunis-core/commit/c084c84a1c4dd8ed5b5704de800f5d1b7cbd2dd8))
* **AYC-95:** wire up pinned skills below chat input on new chat page ([#252](https://github.com/ayunis-core/ayunis-core/issues/252)) ([a1af108](https://github.com/ayunis-core/ayunis-core/commit/a1af10887cf82984afd500fc6511cd1a5a233688))
* support git worktrees in pre-commit hook ([#177](https://github.com/ayunis-core/ayunis-core/issues/177)) ([9ab139e](https://github.com/ayunis-core/ayunis-core/commit/9ab139e195983b3f95ad8e204ada19325fc0ed12))
* translate user role to 'Benutzer' in German admin pages ([#285](https://github.com/ayunis-core/ayunis-core/issues/285)) ([3f4c881](https://github.com/ayunis-core/ayunis-core/commit/3f4c88118dee7a1fee8b4cbf23f467fe3b6440ff))
* use 'Chat' instead of 'Thread' in chat page translations ([#284](https://github.com/ayunis-core/ayunis-core/issues/284)) ([30c5bd2](https://github.com/ayunis-core/ayunis-core/commit/30c5bd287a041ae0f94536f807a997c1a18e7c2f))


### Performance Improvements

* **AYC-000:** optimize backend test performance in CI ([#231](https://github.com/ayunis-core/ayunis-core/issues/231)) ([f4a1b2a](https://github.com/ayunis-core/ayunis-core/commit/f4a1b2a9637423945d5569c6065d1444ac5228ef))


### Code Refactoring

* **AYC-000:** deduplicate frontend components into shared widgets ([#201](https://github.com/ayunis-core/ayunis-core/issues/201)) ([05e5966](https://github.com/ayunis-core/ayunis-core/commit/05e5966f1aebd15f32994f4643ab11f8111a3d6a))
* **AYC-000:** reduce cognitive complexity in create-invite use case ([#194](https://github.com/ayunis-core/ayunis-core/issues/194)) ([01d57a0](https://github.com/ayunis-core/ayunis-core/commit/01d57a027b1160a5e0e0711053f7745315300f60))
* **AYC-000:** simplify null check with optional chaining in update-team use case ([#193](https://github.com/ayunis-core/ayunis-core/issues/193)) ([d9a9962](https://github.com/ayunis-core/ayunis-core/commit/d9a9962336769ae69ffb8727b07f27b57458c2f9))


### Documentation

* **AYC-000:** fix new-module skill inaccuracies ([#186](https://github.com/ayunis-core/ayunis-core/issues/186)) ([b6d1ba7](https://github.com/ayunis-core/ayunis-core/commit/b6d1ba71cd59c1fe51a0fef936c1ed5114698fba))


### Miscellaneous

* **AYC-000:** add browser-verify claude skill ([#235](https://github.com/ayunis-core/ayunis-core/issues/235)) ([6eb0345](https://github.com/ayunis-core/ayunis-core/commit/6eb0345a99198872c7a085785cdd6227b049ff84))
* **AYC-000:** add coverage thresholds and new-module/new-page skills ([#185](https://github.com/ayunis-core/ayunis-core/issues/185)) ([d486af0](https://github.com/ayunis-core/ayunis-core/commit/d486af0b8bc4235b0aee5636cf005a859a0cd83a))
* **AYC-000:** add file size check script and root quality tools ([#182](https://github.com/ayunis-core/ayunis-core/issues/182)) ([492b688](https://github.com/ayunis-core/ayunis-core/commit/492b688b3c830d1488c95396466006ee0c7f276c))
* **AYC-000:** add file size, madge, and markdownlint checks to pre-commit hook ([#183](https://github.com/ayunis-core/ayunis-core/issues/183)) ([6b9676e](https://github.com/ayunis-core/ayunis-core/commit/6b9676ecb70046941465c919c01598323e2458c3))
* **AYC-000:** add frontend BUGBOT.md to enforce Ayunis UI library usage ([#260](https://github.com/ayunis-core/ayunis-core/issues/260)) ([eff8807](https://github.com/ayunis-core/ayunis-core/commit/eff8807ca0e291db47b72cc8fa3eb6fe71c1b630))
* **AYC-000:** add wip prefix for changelog-excluded PRs ([#187](https://github.com/ayunis-core/ayunis-core/issues/187)) ([4c60eff](https://github.com/ayunis-core/ayunis-core/commit/4c60eff879276fac7f3c0746872b3ed6ec2aabd5))
* **AYC-000:** enable strict typescript on backend ([#181](https://github.com/ayunis-core/ayunis-core/issues/181)) ([eada9df](https://github.com/ayunis-core/ayunis-core/commit/eada9df1c00ce2bc31fc0116cc847af4f9a8547e))
* **AYC-000:** install eslint plugins, fix backend any occurrences, and consolidate error handling ([#178](https://github.com/ayunis-core/ayunis-core/issues/178)) ([b57ce58](https://github.com/ayunis-core/ayunis-core/commit/b57ce580aa6f04a72df51570573c12d6526d128f))
* **AYC-000:** move agent skills and docs to ayunis-ai, symlink back ([#257](https://github.com/ayunis-core/ayunis-core/issues/257)) ([e7b35c5](https://github.com/ayunis-core/ayunis-core/commit/e7b35c50ab00ce34419228bbca1e639250aa63b5))
* **AYC-000:** refactor seed scripts with proper fixtures and embedding model support ([#236](https://github.com/ayunis-core/ayunis-core/issues/236)) ([06547d2](https://github.com/ayunis-core/ayunis-core/commit/06547d2aa86d40c092aa096f317bd71f5bbd231d))
* **AYC-000:** remove e2e UI test package and all references ([#203](https://github.com/ayunis-core/ayunis-core/issues/203)) ([6bb1e89](https://github.com/ayunis-core/ayunis-core/commit/6bb1e8982fb4d259ad390e49405f0c8f7d097c7c))
* **AYC-000:** remove langfuse dependency and all tracing code ([#190](https://github.com/ayunis-core/ayunis-core/issues/190)) ([aa098bb](https://github.com/ayunis-core/ayunis-core/commit/aa098bb5be9912a06d19b5ca6cb4f921b8e34d30))
* **AYC-000:** tighten backend eslint config with sonarjs and stricter rules ([#179](https://github.com/ayunis-core/ayunis-core/issues/179)) ([b61f8ad](https://github.com/ayunis-core/ayunis-core/commit/b61f8ad64924265493d807adc3796fe697f18a58))
* **AYC-000:** tighten frontend eslint config with sonarjs, unused-imports, and stricter rules ([#180](https://github.com/ayunis-core/ayunis-core/issues/180)) ([c4b77bf](https://github.com/ayunis-core/ayunis-core/commit/c4b77bf767e2a39a3848b6a0eca514d279c7ed60))
* **AYC-000:** upgrade dotenv to v17 and override fast-xml-parser to fix critical CVE ([#202](https://github.com/ayunis-core/ayunis-core/issues/202)) ([9f418c6](https://github.com/ayunis-core/ayunis-core/commit/9f418c6992c7a4c23e793be4931633af9f7c3bbf))
* **deps-actions:** bump actions/checkout from 4 to 6 ([#137](https://github.com/ayunis-core/ayunis-core/issues/137)) ([0d6c6d1](https://github.com/ayunis-core/ayunis-core/commit/0d6c6d1884c4d59f9fb8910ef324e63d2ffb1ebd))
* **deps-backend:** bump jest from 29.7.0 to 30.2.0 in /ayunis-core-backend in the testing group ([#157](https://github.com/ayunis-core/ayunis-core/issues/157)) ([d5a6f6c](https://github.com/ayunis-core/ayunis-core/commit/d5a6f6c14bd88be16e97aabd79f4e9ca6babfe0f))
* replace Docker-based dev setup with native backend ([#176](https://github.com/ayunis-core/ayunis-core/issues/176)) ([bfd88d7](https://github.com/ayunis-core/ayunis-core/commit/bfd88d73ea042a3645544810211a8e25f087c1ce))


### CI/CD

* add jscpd ([#174](https://github.com/ayunis-core/ayunis-core/issues/174)) ([a0f8677](https://github.com/ayunis-core/ayunis-core/commit/a0f86770e93aa1f087345f4589d30bd2507a7738))
* **AYC-000:** add circular-deps, dead-code, security-audit, and api-schema-drift workflows ([#184](https://github.com/ayunis-core/ayunis-core/issues/184)) ([2e2eba7](https://github.com/ayunis-core/ayunis-core/commit/2e2eba7983d0977abdb4be2c66e6b323c6284a8d))
* **AYC-000:** add frontend build workflow ([#200](https://github.com/ayunis-core/ayunis-core/issues/200)) ([e37a6bc](https://github.com/ayunis-core/ayunis-core/commit/e37a6bce805fdd2c30bf27ae256da4446c9f3d16))
* **AYC-000:** add PR metrics workflow ([#199](https://github.com/ayunis-core/ayunis-core/issues/199)) ([f4fbb04](https://github.com/ayunis-core/ayunis-core/commit/f4fbb04ac52e3f2f23ca7fc925bf8643c3e87531))

## [1.11.0](https://github.com/ayunis-core/ayunis-core/compare/v1.10.0...v1.11.0) (2026-02-18)


### Features

* add sharing for skills & marketplace install ([#130](https://github.com/ayunis-core/ayunis-core/issues/130)) ([6c5cdee](https://github.com/ayunis-core/ayunis-core/commit/6c5cdeebe8f41565bc5ba701d038352ae7dedb73))
* allow personal system prompt ([#126](https://github.com/ayunis-core/ayunis-core/issues/126)) ([a79b19b](https://github.com/ayunis-core/ayunis-core/commit/a79b19b2b554688e64e4f796d3e18d7e18638a3f))


### Bug Fixes

* add skill create modal translations ([#170](https://github.com/ayunis-core/ayunis-core/issues/170)) ([42e6395](https://github.com/ayunis-core/ayunis-core/commit/42e6395a883937ffcc5ea05a1481df14b83f611f))
* adjust system prompt label translation ([9ba5049](https://github.com/ayunis-core/ayunis-core/commit/9ba5049fbd591f90a0c8808744c00937a986489d))


### Code Refactoring

* extract skill activation into separate entity ([#129](https://github.com/ayunis-core/ayunis-core/issues/129)) ([4c60cf4](https://github.com/ayunis-core/ayunis-core/commit/4c60cf434222731583cc5438acf79f6f6d8dd525))


### Miscellaneous

* add Dependabot for automated dependency updates ([#132](https://github.com/ayunis-core/ayunis-core/issues/132)) ([14b7be2](https://github.com/ayunis-core/ayunis-core/commit/14b7be293ff7d161969d9ff34213332e0696762f))
* add dependency-cruiser for architecture enforcement ([#131](https://github.com/ayunis-core/ayunis-core/issues/131)) ([727d9f5](https://github.com/ayunis-core/ayunis-core/commit/727d9f51813a48f1b83146130b6820f830b9c9ee))
* add Docker logging rotation, resource limits, and Dozzle ([#128](https://github.com/ayunis-core/ayunis-core/issues/128)) ([1b553b1](https://github.com/ayunis-core/ayunis-core/commit/1b553b1d2c9d3a7866bca42916d4a52e8963147d))
* **deps-actions:** bump actions/setup-node from 4 to 6 ([#134](https://github.com/ayunis-core/ayunis-core/issues/134)) ([cd15db9](https://github.com/ayunis-core/ayunis-core/commit/cd15db9fd6bfb5b94dde190c96fa7f5730047111))
* **deps-actions:** bump actions/upload-artifact from 4 to 6 ([#141](https://github.com/ayunis-core/ayunis-core/issues/141)) ([bafc291](https://github.com/ayunis-core/ayunis-core/commit/bafc291490fd0ff43f2cba813f140101dff0fdf9))
* **deps-actions:** bump appleboy/ssh-action from 1.2.0 to 1.2.5 ([#139](https://github.com/ayunis-core/ayunis-core/issues/139)) ([319203c](https://github.com/ayunis-core/ayunis-core/commit/319203c13a5b66d4a36e49592f9619f7fc59a6c4))
* **deps-actions:** bump tj-actions/changed-files from 44 to 47 ([#136](https://github.com/ayunis-core/ayunis-core/issues/136)) ([48a29f5](https://github.com/ayunis-core/ayunis-core/commit/48a29f5fbea0905d2dc73acc525ff7a57b15ec34))
* **deps-anonymize:** bump presidio-analyzer in /ayunis-core-anonymize ([#142](https://github.com/ayunis-core/ayunis-core/issues/142)) ([9f288c1](https://github.com/ayunis-core/ayunis-core/commit/9f288c1cc7e7509437620ef018a446b798851eea))
* **deps-anonymize:** bump pydantic in /ayunis-core-anonymize ([#145](https://github.com/ayunis-core/ayunis-core/issues/145)) ([8b36df5](https://github.com/ayunis-core/ayunis-core/commit/8b36df5f507b537b1f28cd3c8b6e80e18deca5d7))
* **deps-backend:** bump @google/genai in /ayunis-core-backend ([#160](https://github.com/ayunis-core/ayunis-core/issues/160)) ([bc6b9a7](https://github.com/ayunis-core/ayunis-core/commit/bc6b9a741c386e2f038437f67cc8daf893383f10))
* **deps-backend:** bump @mistralai/mistralai in /ayunis-core-backend ([#162](https://github.com/ayunis-core/ayunis-core/issues/162)) ([dc9de47](https://github.com/ayunis-core/ayunis-core/commit/dc9de477debf3d72d886a328941f3522339a5210))
* **deps-backend:** bump eslint-plugin-prettier in /ayunis-core-backend ([#164](https://github.com/ayunis-core/ayunis-core/issues/164)) ([6829ed2](https://github.com/ayunis-core/ayunis-core/commit/6829ed28af9986f0c049b6ed9e5cb333e156a23b))
* **deps-backend:** bump ollama in /ayunis-core-backend ([#168](https://github.com/ayunis-core/ayunis-core/issues/168)) ([3a719e6](https://github.com/ayunis-core/ayunis-core/commit/3a719e674ea06568db9677988c7bf8b0feaf598e))
* **deps-backend:** bump pg in /ayunis-core-backend ([#167](https://github.com/ayunis-core/ayunis-core/issues/167)) ([ad32367](https://github.com/ayunis-core/ayunis-core/commit/ad3236733e024ace87feecfb529adc19c2e53e5f))
* **deps-docker:** bump cypress/included in /ayunis-core-e2e-ui-tests ([#133](https://github.com/ayunis-core/ayunis-core/issues/133)) ([94aba37](https://github.com/ayunis-core/ayunis-core/commit/94aba370c3dce7f45408f9b9ace67eab63cdd09b))
* **deps-e2e:** bump cypress in /ayunis-core-e2e-ui-tests ([#143](https://github.com/ayunis-core/ayunis-core/issues/143)) ([24160cc](https://github.com/ayunis-core/ayunis-core/commit/24160cc10daa3959d8aebf5d042db52060852b66))
* **deps-e2e:** bump globals in /ayunis-core-e2e-ui-tests ([#149](https://github.com/ayunis-core/ayunis-core/issues/149)) ([407bb0f](https://github.com/ayunis-core/ayunis-core/commit/407bb0fd890094520968eb4f3d23e7ca2216c326))
* **deps-e2e:** bump jiti in /ayunis-core-e2e-ui-tests ([#140](https://github.com/ayunis-core/ayunis-core/issues/140)) ([c9b01ea](https://github.com/ayunis-core/ayunis-core/commit/c9b01ea5a90289d7304ff719bdd8272a475e863e))
* **deps-e2e:** bump prettier in /ayunis-core-e2e-ui-tests ([#144](https://github.com/ayunis-core/ayunis-core/issues/144)) ([fa9bf0c](https://github.com/ayunis-core/ayunis-core/commit/fa9bf0c82c8827c750b9298bba8354adf309b030))
* **deps-e2e:** bump typescript in /ayunis-core-e2e-ui-tests ([#147](https://github.com/ayunis-core/ayunis-core/issues/147)) ([d6132c8](https://github.com/ayunis-core/ayunis-core/commit/d6132c81d3451b47fbf1865bf0e46b9456f0e8ce))
* **deps-frontend:** bump @tailwindcss/typography ([#156](https://github.com/ayunis-core/ayunis-core/issues/156)) ([9ad2b2b](https://github.com/ayunis-core/ayunis-core/commit/9ad2b2b32ddf9ab78f878a0ea278399bc3eff04b))
* **deps-frontend:** bump i18next in /ayunis-core-frontend ([#163](https://github.com/ayunis-core/ayunis-core/issues/163)) ([5a4a566](https://github.com/ayunis-core/ayunis-core/commit/5a4a56606f6537465e427e696d9e394efdd578df))
* **deps-frontend:** bump react-day-picker in /ayunis-core-frontend ([#161](https://github.com/ayunis-core/ayunis-core/issues/161)) ([ebb1a64](https://github.com/ayunis-core/ayunis-core/commit/ebb1a6460f9d8b1afc43723b96c67d0fb8c29f67))
* **deps-frontend:** bump typescript in /ayunis-core-frontend ([#158](https://github.com/ayunis-core/ayunis-core/issues/158)) ([9ca5f83](https://github.com/ayunis-core/ayunis-core/commit/9ca5f836ada5301d3e62bb0787e430e4c4140493))

## [1.10.0](https://github.com/ayunis-core/ayunis-core/compare/v1.9.0...v1.10.0) (2026-02-13)


### Features

* add role column to super-admin org detail users table ([#119](https://github.com/ayunis-core/ayunis-core/issues/119)) ([96fe58f](https://github.com/ayunis-core/ayunis-core/commit/96fe58f42c5340e4a71f7dfd3e3f4534b876e7a1))
* add skills ([#124](https://github.com/ayunis-core/ayunis-core/issues/124)) ([2883323](https://github.com/ayunis-core/ayunis-core/commit/2883323eab30b12c6676f00503c241ca03c93f9e))
* disable skill tools and prompt hints for cloud instances ([#125](https://github.com/ayunis-core/ayunis-core/issues/125)) ([6d21613](https://github.com/ayunis-core/ayunis-core/commit/6d21613ce88bf7b709530f8bfeb38c4b03a96846))
* improve usage display ([#122](https://github.com/ayunis-core/ayunis-core/issues/122)) ([bdd6cd0](https://github.com/ayunis-core/ayunis-core/commit/bdd6cd0f5141197fbdb1f1500f938d07d714b79c))


### Bug Fixes

* improve chat input accessibility ([#121](https://github.com/ayunis-core/ayunis-core/issues/121)) ([35d7d9e](https://github.com/ayunis-core/ayunis-core/commit/35d7d9ec419d09d4ce2274533d8246b66fe6ad77))


### Miscellaneous

* add migration AI skill ([#123](https://github.com/ayunis-core/ayunis-core/issues/123)) ([acf0692](https://github.com/ayunis-core/ayunis-core/commit/acf0692edfb67f0199576cf2314d729404113648))
* add scripts for db backup ([#118](https://github.com/ayunis-core/ayunis-core/issues/118)) ([e27c180](https://github.com/ayunis-core/ayunis-core/commit/e27c180fecc5e381f3f741d2e54ad86a565f5427))

## [1.9.0](https://github.com/ayunis-core/ayunis-core/compare/v1.8.0...v1.9.0) (2026-02-10)


### Features

* install agent from marketplace ([#116](https://github.com/ayunis-core/ayunis-core/issues/116)) ([a7bddb5](https://github.com/ayunis-core/ayunis-core/commit/a7bddb55da4954679cf719c7de28401c0116bf7f))


### Bug Fixes

* **AYC-51:** fix tool schema validation ([#117](https://github.com/ayunis-core/ayunis-core/issues/117)) ([a0a8e34](https://github.com/ayunis-core/ayunis-core/commit/a0a8e34d39c794decbae04c18f3091be34012e6a))


### Miscellaneous

* add dev skills ([#114](https://github.com/ayunis-core/ayunis-core/issues/114)) ([45c5d1a](https://github.com/ayunis-core/ayunis-core/commit/45c5d1a7e6d61f582dd96bce59f9c79a1a3dde04))

## [1.8.0](https://github.com/ayunis-core/ayunis-core/compare/v1.7.0...v1.8.0) (2026-02-09)


### Features

* resend expired invites ([#112](https://github.com/ayunis-core/ayunis-core/issues/112)) ([b22324a](https://github.com/ayunis-core/ayunis-core/commit/b22324af0995e6a2435b4e68940f589b95ffeb9f))


### Bug Fixes

* invalidate router cache when agent model is updated ([#109](https://github.com/ayunis-core/ayunis-core/issues/109)) ([446394d](https://github.com/ayunis-core/ayunis-core/commit/446394d8d5512d361d3af298dc6cc7a98339554d))
* make tooltip for anonymous mode shorter ([#111](https://github.com/ayunis-core/ayunis-core/issues/111)) ([74c0bed](https://github.com/ayunis-core/ayunis-core/commit/74c0bedfd3eeccff53fe4ee5cc53017a06972c41))


### Miscellaneous

* add pyramid summaries and improve AGENTS.md ([#113](https://github.com/ayunis-core/ayunis-core/issues/113)) ([1580177](https://github.com/ayunis-core/ayunis-core/commit/158017767def22488e187a8c428ad1a96bb7044e))

## [1.7.0](https://github.com/ayunis-core/ayunis-core/compare/v1.6.0...v1.7.0) (2026-02-04)


### Features

* show funny loading indicator until first assistant message ([#106](https://github.com/ayunis-core/ayunis-core/issues/106)) ([936b1d2](https://github.com/ayunis-core/ayunis-core/commit/936b1d2a2edc29b2f507566b2e3e3c1481767bb3))


### Bug Fixes

* group agents in chats filter ([#105](https://github.com/ayunis-core/ayunis-core/issues/105)) ([3cacac0](https://github.com/ayunis-core/ayunis-core/commit/3cacac0278587d48014d3d616b5975f411c8972a))


### Code Refactoring

* update LongChatWarning component and add Alert component ([#100](https://github.com/ayunis-core/ayunis-core/issues/100)) ([cc24d27](https://github.com/ayunis-core/ayunis-core/commit/cc24d2721159da40c66bfe4baeacd70bc3b484a0))

## [1.6.0](https://github.com/ayunis-core/ayunis-core/compare/v1.5.0...v1.6.0) (2026-02-03)


### Features

* add voice dictation ([#102](https://github.com/ayunis-core/ayunis-core/issues/102)) ([75a5f9c](https://github.com/ayunis-core/ayunis-core/commit/75a5f9c9f1ec80a6eb6c08f713cad4e8a9180c43))
* integrate new release notes widget ([60a6f5c](https://github.com/ayunis-core/ayunis-core/commit/60a6f5c56368e01f9f8113c61dc0918755170800))


### Bug Fixes

* improve user selection for teams ([#97](https://github.com/ayunis-core/ayunis-core/issues/97)) ([7a99e66](https://github.com/ayunis-core/ayunis-core/commit/7a99e66e2c24093fa674efca370584c3cd8bf764))
* invalidate agents cache when team membership changes ([#96](https://github.com/ayunis-core/ayunis-core/issues/96)) ([81da345](https://github.com/ayunis-core/ayunis-core/commit/81da345190d103e184684263df47532ebbf6138a))
* remove client directive AYC-000 ([#99](https://github.com/ayunis-core/ayunis-core/issues/99)) ([50e5d32](https://github.com/ayunis-core/ayunis-core/commit/50e5d325a4c51b334caa98b843e61f98f0d75fe1))


### CI/CD

* clean up after deploy ([#103](https://github.com/ayunis-core/ayunis-core/issues/103)) ([9aae6ab](https://github.com/ayunis-core/ayunis-core/commit/9aae6ab1aefa64743d1992ad8502817160b393fe))

## [1.5.0](https://github.com/ayunis-core/ayunis-core/compare/v1.4.0...v1.5.0) (2026-01-30)


### Features

* add gemini provider and handlers AYC-74 ([#92](https://github.com/ayunis-core/ayunis-core/issues/92)) ([25b4066](https://github.com/ayunis-core/ayunis-core/commit/25b4066c897b7fc44981691958c0adf8882c5865))

## [1.4.0](https://github.com/ayunis-core/ayunis-core/compare/v1.3.1...v1.4.0) (2026-01-29)


### Features

* add total user count to user table ([#94](https://github.com/ayunis-core/ayunis-core/issues/94)) ([1f45e8b](https://github.com/ayunis-core/ayunis-core/commit/1f45e8b84b470d526067e0ba5031485cefcb1469))


### Bug Fixes

* remove user from table on deletion ([#91](https://github.com/ayunis-core/ayunis-core/issues/91)) ([43af864](https://github.com/ayunis-core/ayunis-core/commit/43af864e126c2aa487e0cf303664498da0712925))


### CI/CD

* trigger docs update after deploy ([#87](https://github.com/ayunis-core/ayunis-core/issues/87)) ([044c246](https://github.com/ayunis-core/ayunis-core/commit/044c246500155b5fbe94b257b8a9a533fdf795d7))

## [1.3.1](https://github.com/ayunis-core/ayunis-core/compare/v1.3.0...v1.3.1) (2026-01-26)


### Bug Fixes

* improve help texts when password reset link expired ([#84](https://github.com/ayunis-core/ayunis-core/issues/84)) ([53f4e5f](https://github.com/ayunis-core/ayunis-core/commit/53f4e5ff6086233c32b77204529acd33d163a913))

## [1.3.0](https://github.com/ayunis-core/ayunis-core/compare/v1.2.0...v1.3.0) (2026-01-26)


### Features

* use mistral document ai for pdf parsind AYC-000 ([#81](https://github.com/ayunis-core/ayunis-core/issues/81)) ([1e9ec16](https://github.com/ayunis-core/ayunis-core/commit/1e9ec16f191126a7ae33120aae0b13c17409c308))


### CI/CD

* improve deployment slack message ([#82](https://github.com/ayunis-core/ayunis-core/issues/82)) ([757af45](https://github.com/ayunis-core/ayunis-core/commit/757af45b64bc228c3d2e08e26af856f214e9df8f))

## [1.2.0](https://github.com/ayunis-core/ayunis-core/compare/v1.1.0...v1.2.0) (2026-01-23)


### Features

* Add disclaimer about AI accuracy and fact checking to chat page ([#76](https://github.com/ayunis-core/ayunis-core/issues/76)) ([1c4ecd9](https://github.com/ayunis-core/ayunis-core/commit/1c4ecd9c57a254ec0720aafbf5cfcfb39a85e7dd))
* group agents in chat input ([#77](https://github.com/ayunis-core/ayunis-core/issues/77)) ([9aefbb8](https://github.com/ayunis-core/ayunis-core/commit/9aefbb828e9817dce053c26e4ea3005e31f160b4))
* introduce 'teams' and make agents sharable to teams AYC-55 ([#27](https://github.com/ayunis-core/ayunis-core/issues/27)) ([b985aec](https://github.com/ayunis-core/ayunis-core/commit/b985aecf2b94931747fcb7d5a38b8c6a9a0eeec9))


### Miscellaneous

* remove unused folders AYC-000 ([#73](https://github.com/ayunis-core/ayunis-core/issues/73)) ([2369369](https://github.com/ayunis-core/ayunis-core/commit/236936947df481a6e308b4af6bd036a39e6f979e))

## [1.1.0](https://github.com/ayunis-core/ayunis-core/compare/v1.0.0...v1.1.0) (2026-01-19)


### Features

* add agent knowledge base ([1b20c05](https://github.com/ayunis-core/ayunis-core/commit/1b20c05cf4ad6849eab4680b3169a3658c0a6d42))
* add agents ([fff7a50](https://github.com/ayunis-core/ayunis-core/commit/fff7a50ed1530495ffcdb99d5053719e8d11ef3e))
* add async context for userId and orgId and simplify use cases ([7e20549](https://github.com/ayunis-core/ayunis-core/commit/7e20549fc0b2f9d49d8060b895ef56f1c81e76b7))
* add aws bedrock ([#46](https://github.com/ayunis-core/ayunis-core/issues/46)) AYC-63 ([79ccf46](https://github.com/ayunis-core/ayunis-core/commit/79ccf46233c7c9c2a516a9409dd8ab5725b93db9))
* add ayunis model provider ([c7854b3](https://github.com/ayunis-core/ayunis-core/commit/c7854b3b749aff91a1dc41909be6ef3d5e76da5b))
* add better error handling AYC-000 ([#32](https://github.com/ayunis-core/ayunis-core/issues/32)) ([cd9f388](https://github.com/ayunis-core/ayunis-core/commit/cd9f3885b5d857dbf230b047bcfcc3eb7bd8ed96))
* add branding assets ([8cfc5dc](https://github.com/ayunis-core/ayunis-core/commit/8cfc5dc77812abae76914a35642ea8c56a16cddb))
* add bugbot policies AYC-000 ([f71a483](https://github.com/ayunis-core/ayunis-core/commit/f71a483b656f61e2b28e38122c2806cc79ec38c1))
* add chart tools (bar, line, pie) and make them always available. ([f2f3ff9](https://github.com/ayunis-core/ayunis-core/commit/f2f3ff9370e7177c41a5be9534e6bae833c3c0ef))
* add chat input help AYC-52 ([7c2cbb8](https://github.com/ayunis-core/ayunis-core/commit/7c2cbb8e4c27b933e4ed5d8c87d3d29d5b69ac38))
* add chat search AYC-60 ([#36](https://github.com/ayunis-core/ayunis-core/issues/36)) ([0f9b6c5](https://github.com/ayunis-core/ayunis-core/commit/0f9b6c5b8e92d0ea97e6c8d81dcbc8a89db5a10d))
* add clarifying comment to child chunk record ([be07519](https://github.com/ayunis-core/ayunis-core/commit/be07519bf5c12f19a87d0838289847dc64f945ca))
* add code exec micro service ([7efda05](https://github.com/ayunis-core/ayunis-core/commit/7efda058ef2b0f847cb15321510282b9fb11e82e))
* add consent mode script to gtm ([26f8984](https://github.com/ayunis-core/ayunis-core/commit/26f898499a8d89c700e7fc00a8b6a2fcf266b6c1))
* add Create Calendar Event tool and integrate with chat interface ([e61f65b](https://github.com/ayunis-core/ayunis-core/commit/e61f65b167b5abf9d1cb27d3741518162550adbe))
* add debugging logs for stage ([acc6431](https://github.com/ayunis-core/ayunis-core/commit/acc64313527338977f84a85042bbbbb3c43ea5fa))
* add docling as file retriever AYC-34 ([#29](https://github.com/ayunis-core/ayunis-core/issues/29)) ([ded8356](https://github.com/ayunis-core/ayunis-core/commit/ded8356755d5d1066a8815760279ef55d00cd143))
* add email provider blacklist ([c43675d](https://github.com/ayunis-core/ayunis-core/commit/c43675dddc70742e25b14d3444590deb386077f6))
* add email sending widget ([5b1001c](https://github.com/ayunis-core/ayunis-core/commit/5b1001c532680890512a9105dd56ee65cdfe5294))
* add embedding models alongside language models ([d426353](https://github.com/ayunis-core/ayunis-core/commit/d4263535d37ce6993832d8b6fd3703b4ae65bb7e))
* add embedding support for ollama ([f471813](https://github.com/ayunis-core/ayunis-core/commit/f471813b2a4fee3b0253ef26038f9fb1746f47dc))
* Add error boundary and DOM patch for browser extension conflicts AYC-000 ([2dee90a](https://github.com/ayunis-core/ayunis-core/commit/2dee90a2eccf69ceaa053854cde8461b7473a6a5))
* add error screen for email confirm ([9e33f73](https://github.com/ayunis-core/ayunis-core/commit/9e33f730eb848a1c86c78b6574a6e9d1adecacb1))
* add error screen for invites ([e9c0611](https://github.com/ayunis-core/ayunis-core/commit/e9c061189bf04a849fee8f35d31a8b11d6701450))
* add excel file upload ([#31](https://github.com/ayunis-core/ayunis-core/issues/31)) ([ceca98d](https://github.com/ayunis-core/ayunis-core/commit/ceca98df91e1fec0ec796b37c766d705377388de))
* add favicon ([28cbc73](https://github.com/ayunis-core/ayunis-core/commit/28cbc734de09bbea526abe207adb724b1686ebaa))
* add flags and region-based sorting to user default model picker ([#64](https://github.com/ayunis-core/ayunis-core/issues/64)) ([9297262](https://github.com/ayunis-core/ayunis-core/commit/92972621a02436523253e2d7aef774ce915e655b))
* add full text to source ([e7021ac](https://github.com/ayunis-core/ayunis-core/commit/e7021ac0ad1463e3321324ec40302c2ff259dade))
* add gradient asset ([182e127](https://github.com/ayunis-core/ayunis-core/commit/182e127176fb65238fc1b1ea7f17800fc8333528))
* add gtm ([3354a5d](https://github.com/ayunis-core/ayunis-core/commit/3354a5d99727bf2a95b6f3daee0a92ffe1281cdb))
* add heartbeat to SSE to prevent disconnects ([731faa8](https://github.com/ayunis-core/ayunis-core/commit/731faa87ab53148ed6163dbf6ecb5c81b9dd229a))
* Add hint about dimensions ([059f485](https://github.com/ayunis-core/ayunis-core/commit/059f4850ed67980b5363d8aab2238303bb835a78))
* add internet search ([63aa7e0](https://github.com/ayunis-core/ayunis-core/commit/63aa7e04b93c8792593366e56bfcf1489258ac64))
* add invitation emails ([1551824](https://github.com/ayunis-core/ayunis-core/commit/1551824923a75b5976a0acbe1c6b4c09b4c6929f))
* add inxmail ([2b54d31](https://github.com/ayunis-core/ayunis-core/commit/2b54d31f8520af22e560fcbcfc16d47f54814001))
* add legal acceptance tracking ([351c440](https://github.com/ayunis-core/ayunis-core/commit/351c440ac3d506c5edffcf841069a9ece2d89389))
* add legal links to registration ([a92f9bb](https://github.com/ayunis-core/ayunis-core/commit/a92f9bb3c26085d798ade551b174c120e6c8ab07))
* add legal mcp server as predefined MCP AYC-43 ([56441a9](https://github.com/ayunis-core/ayunis-core/commit/56441a9b881e39729a749f0c5bbd3facbe8c9ca6))
* add loading state to widgets ([13dfb55](https://github.com/ayunis-core/ayunis-core/commit/13dfb5571364e40073da75c1ee1249ef37986400))
* add marketing consent ([f5cb624](https://github.com/ayunis-core/ayunis-core/commit/f5cb6244c672d9c7e9fcaaacfa84adf54c99060d))
* add mock inference response handlers ([b795a67](https://github.com/ayunis-core/ayunis-core/commit/b795a6776defca25ed0dec179edd110e3b966965))
* add model management to super admin, fix bugs ([fc9017d](https://github.com/ayunis-core/ayunis-core/commit/fc9017da24f0bd7ff0f90f04801d3065f2c060df))
* add ollama support ([ff28b0d](https://github.com/ayunis-core/ayunis-core/commit/ff28b0d82328659ba0f9135244667153e8d7a0d3))
* add password reset ([5c9c529](https://github.com/ayunis-core/ayunis-core/commit/5c9c5292654d6bd3f38d546482284bfdb5124b8a))
* add pdf parse as file retriever fallback ([b88278f](https://github.com/ayunis-core/ayunis-core/commit/b88278f5862837ff554593ae37f0d1d37db1076b))
* add permitted models through modelId ([f0a4458](https://github.com/ayunis-core/ayunis-core/commit/f0a4458a864138c899740dab0da39196dafe6d07))
* add plausible integration ([30c6ca9](https://github.com/ayunis-core/ayunis-core/commit/30c6ca9f1d3c4053a4e733db88c65ccd07d0b12d))
* Add presidio to prod compose AYC-47 ([fa0d997](https://github.com/ayunis-core/ayunis-core/commit/fa0d9975c4871ea23490ac799096ceb81067e3f4))
* Add privacy mode with PII anonymization for chats AYC-47 ([#18](https://github.com/ayunis-core/ayunis-core/issues/18)) ([296a7f2](https://github.com/ayunis-core/ayunis-core/commit/296a7f21ba7df2fa59bd64451b47ca6dfe67d9b1))
* add product knowledge AYC-52 ([#21](https://github.com/ayunis-core/ayunis-core/issues/21)) ([36685d3](https://github.com/ayunis-core/ayunis-core/commit/36685d3a30ac0df99473b70b29b30b49ac6e7208))
* add provider permissions ([e36c6e9](https://github.com/ayunis-core/ayunis-core/commit/e36c6e9d86fe4b72857439436b44471e147631d4))
* add rag hint to docs ([173416a](https://github.com/ayunis-core/ayunis-core/commit/173416aed0ddad6f4ed9b3150ff22df2aa725ff2))
* add rate limiting to sensitive routes ([a5aeb8e](https://github.com/ayunis-core/ayunis-core/commit/a5aeb8eef0dc113302a08d99f48fdfea0f37a812))
* add release notes widget AYC-62 ([#39](https://github.com/ayunis-core/ayunis-core/issues/39)) ([88b9755](https://github.com/ayunis-core/ayunis-core/commit/88b9755056f71a7063329d4123b31b889999569e))
* add responsiveness to onboarding layout ([6b6a9f9](https://github.com/ayunis-core/ayunis-core/commit/6b6a9f97a4eae1879f519004e5511e50f5a34edf))
* add search and pagination ([#48](https://github.com/ayunis-core/ayunis-core/issues/48)) AYC-64 ([9d89f2e](https://github.com/ayunis-core/ayunis-core/commit/9d89f2e973a410864a4057483179a0b4490f81c5))
* Add Sentry error tracking integration AYC-000 ([87f3bcf](https://github.com/ayunis-core/ayunis-core/commit/87f3bcf87f5e17efd0434dc2ec86597d9859d9d6))
* add subscription seeding to enable E2E tests ([954d3c8](https://github.com/ayunis-core/ayunis-core/commit/954d3c85e5da862f85c6309bcecf0a09b5f17a00))
* add subscription self service ([695b26d](https://github.com/ayunis-core/ayunis-core/commit/695b26d2979039ccae79abebb84ef1906373ba68))
* add super admin flag ([d7004b6](https://github.com/ayunis-core/ayunis-core/commit/d7004b68bda4cf36540016a559c1f3ba46490590))
* add super admin user and subscription management ([ad8d776](https://github.com/ayunis-core/ayunis-core/commit/ad8d776d5391621b1b9ea13e8ceed0c922f408d3))
* add synaforce as provider ([97679c9](https://github.com/ayunis-core/ayunis-core/commit/97679c98c4c7270bba7ae4e115cf62464df57b44))
* add table rendering in markdown parser ([688cb24](https://github.com/ayunis-core/ayunis-core/commit/688cb24a1ff96a412c9b694fe09687b4377b374a))
* add thinking model support for ollama ([5acaf81](https://github.com/ayunis-core/ayunis-core/commit/5acaf812b765ee4eb582708b78d9403a90f5092f))
* add thread title generation for and non stream handler for ollama ([06e4387](https://github.com/ayunis-core/ayunis-core/commit/06e43873ba67cd5383141c03dcf8d5939ef52ba1))
* add time based greetings to New Chat page ([8d45621](https://github.com/ayunis-core/ayunis-core/commit/8d45621d82cdf20ea4fc25d4c47c42cc607732cc))
* add tooltip to document upload when disabled ([#59](https://github.com/ayunis-core/ayunis-core/issues/59)) ([32e0a76](https://github.com/ayunis-core/ayunis-core/commit/32e0a760d15eee89a2dd8f7f15eb60e2034018f8))
* add tooltips to model capabilities in provider card ([d35b04a](https://github.com/ayunis-core/ayunis-core/commit/d35b04ae79fef6ccc278aacd92b484b8570af36b))
* add trial info to super admin page TASK: AYC-39 ([1369805](https://github.com/ayunis-core/ayunis-core/commit/1369805afa5257db90c19c1aedf6ef6d48eb398a))
* add user centrics popup ([5fde203](https://github.com/ayunis-core/ayunis-core/commit/5fde2030161db3bf28103183f6858a9ccb3730bd))
* add vision models AYC-20 ([9c88b7a](https://github.com/ayunis-core/ayunis-core/commit/9c88b7a1d4763dbc461179553b703796ba44728e))
* add warning about mistral ocr when enabling mistral provider ([e80cf6e](https://github.com/ayunis-core/ayunis-core/commit/e80cf6ed410a82f445b1c7baceb86bf2fd51ef83))
* add webhooks for org events ([0520001](https://github.com/ayunis-core/ayunis-core/commit/05200013682b6b1e5bcbd96f7d517562284265ec))
* add word and ppt support ([#33](https://github.com/ayunis-core/ayunis-core/issues/33)) AYC-34 ([9ceec22](https://github.com/ayunis-core/ayunis-core/commit/9ceec220470de23630843694fcac32a3f105c205))
* adjust docs ([6e9ac99](https://github.com/ayunis-core/ayunis-core/commit/6e9ac99ecacda03bb51aeaaed74ec1268bae91e2))
* adjust provider legal confirmation ([8ea6eff](https://github.com/ayunis-core/ayunis-core/commit/8ea6eff00f64a3ea883a14c2a3d90ca263ccee58))
* adjust styles of charts AYC-000 ([60f3399](https://github.com/ayunis-core/ayunis-core/commit/60f3399d9720a099b4fd17c89ab216ad879a4baf))
* adjust system prompt ([f68bb1a](https://github.com/ayunis-core/ayunis-core/commit/f68bb1a347f13b11e797fcfd3e278d49ba8ef353))
* adjust system prompt & add file get tool ([#66](https://github.com/ayunis-core/ayunis-core/issues/66)) ([cbb7fe5](https://github.com/ayunis-core/ayunis-core/commit/cbb7fe5521b4136fd503fc998fd83cb6d3a0138e))
* admin dashboard ([#10](https://github.com/ayunis-core/ayunis-core/issues/10)) AYC-22 ([c6161d3](https://github.com/ayunis-core/ayunis-core/commit/c6161d337c8c3ea63412ebb697f26d2673e4a96f))
* agent creation default model ([#44](https://github.com/ayunis-core/ayunis-core/issues/44)) ([680f243](https://github.com/ayunis-core/ayunis-core/commit/680f243f586b97af9d3875816a6299eab289fa62))
* Agent sharing functionality (AYC-32) ([#15](https://github.com/ayunis-core/ayunis-core/issues/15)) ([adccb13](https://github.com/ayunis-core/ayunis-core/commit/adccb13e8dfe4190a21e9b0fe4aa68471014d15d))
* agents list tabs ([#63](https://github.com/ayunis-core/ayunis-core/issues/63)) ([9f384b0](https://github.com/ayunis-core/ayunis-core/commit/9f384b06154ac6f88f82378f191d733075257cb3))
* allow admins to send reset pw email to users ([#28](https://github.com/ayunis-core/ayunis-core/issues/28)) ([7ad7293](https://github.com/ayunis-core/ayunis-core/commit/7ad72937e2d9a1abe5e32f6f3aa9367b844fa35b))
* allow disabling of registration ([b0d5b94](https://github.com/ayunis-core/ayunis-core/commit/b0d5b941617c58826d949c9f0ae07655debb0244))
* Allow invite creation without active subscription ([45e7f10](https://github.com/ayunis-core/ayunis-core/commit/45e7f10aa6ef0518568d94a5152c15261189a294))
* allow password change ([0594cce](https://github.com/ayunis-core/ayunis-core/commit/0594cce475baf6d827d0f0d9ad734f03e2924025))
* allow superadmins to set org default model TASK: AYC-38 ([7555030](https://github.com/ayunis-core/ayunis-core/commit/755503028e43ef16f624750c58aec27b36461fc8))
* allow toggling of providers ([7e74dd0](https://github.com/ayunis-core/ayunis-core/commit/7e74dd0d390e704b8b2cdda017f9cd345ccf9ef3))
* allow trial create and update for super admins TASK: AYC-39 ([c1c150c](https://github.com/ayunis-core/ayunis-core/commit/c1c150c935f0d9b89daf6ca943c8a2f544d2a2fb))
* anonymous models ([#19](https://github.com/ayunis-core/ayunis-core/issues/19)) AYC-44 ([9f39579](https://github.com/ayunis-core/ayunis-core/commit/9f3957906b111ddba12599d1ca92ce57678f2623))
* archive models AYC-65 ([#52](https://github.com/ayunis-core/ayunis-core/issues/52)) ([35b6ab3](https://github.com/ayunis-core/ayunis-core/commit/35b6ab32784e2d7c0792c9b0d5bbc05b38f4deaf))
* Assistant message copy button ([#45](https://github.com/ayunis-core/ayunis-core/issues/45)) ([313928f](https://github.com/ayunis-core/ayunis-core/commit/313928ff8375b3ebe7645e80197606bc35eae73f))
* Auto-focus search input in ChatsFilters ([#43](https://github.com/ayunis-core/ayunis-core/issues/43)) ([bcb79b6](https://github.com/ayunis-core/ayunis-core/commit/bcb79b6d234b021e1b63cc0aee11c31ae3aeffdd))
* AYC-40 add sentry ([5981913](https://github.com/ayunis-core/ayunis-core/commit/5981913c62f8565ff1f61643270b81fc993cbd3d))
* AYC-40 avoid throwing errors if not necessary. fix linting ([c5548e6](https://github.com/ayunis-core/ayunis-core/commit/c5548e63a0293bac971ae405e4d67bf0494f6d2a))
* AYC-54 disable self service registration ([#23](https://github.com/ayunis-core/ayunis-core/issues/23)) ([ba9ce69](https://github.com/ayunis-core/ayunis-core/commit/ba9ce690e2ddd5fb002c16b1d8047253b6c69d96))
* bulk invite AYC-66 ([#56](https://github.com/ayunis-core/ayunis-core/issues/56)) ([3e91a0d](https://github.com/ayunis-core/ayunis-core/commit/3e91a0d5fc71c83e470e58946cab50b648cc4f04))
* clarify models in readme ([49801f0](https://github.com/ayunis-core/ayunis-core/commit/49801f0f1c2c4972fe48cfe4d4bdbf9ecda4a75b))
* clarify models in readme ([9ab6106](https://github.com/ayunis-core/ayunis-core/commit/9ab6106a9c92d6701f12a4e2e0537d0f968e2da6))
* clean up on model delete ([58ace17](https://github.com/ayunis-core/ayunis-core/commit/58ace174bd3d501b317ed0c4d04d373eff935420))
* clear existing sources ([cc1cf16](https://github.com/ayunis-core/ayunis-core/commit/cc1cf16207ffe74909e77b396071be6888878307))
* delete permitted models when provider is deleted ([a012795](https://github.com/ayunis-core/ayunis-core/commit/a01279556eb8c18fce0c626adea814bf079f031c))
* display flag for models ([7b4affe](https://github.com/ayunis-core/ayunis-core/commit/7b4affea7bc2c3a87ca6ac70c7fe4c31b5f75d79))
* display integrations as shadcn items ([ea0bbfc](https://github.com/ayunis-core/ayunis-core/commit/ea0bbfce5ad025c9e1442b2f8352da16c6aae07c))
* display tools on agent card ([2f6f39e](https://github.com/ayunis-core/ayunis-core/commit/2f6f39e6302fcb76dfd0351ca1f955cf40bc7472))
* don't include encrypted thinking content and make reasoning effort low ([76aa788](https://github.com/ayunis-core/ayunis-core/commit/76aa788b99371119b3e93cd4ae05f2033eedca5a))
* enable code execution on data sources ([609af07](https://github.com/ayunis-core/ayunis-core/commit/609af072440a9fc1aae695c96edd9688e77525fa))
* enable custom tools in inference endpoint ([751eb3f](https://github.com/ayunis-core/ayunis-core/commit/751eb3f3bb7f8113b2410b0915887dee9deeed4e))
* enable internet search in production ([e658aa3](https://github.com/ayunis-core/ayunis-core/commit/e658aa372eea66acfdb9197ccf64c3173b67b93e))
* enable MCP tool integrations ([12b974e](https://github.com/ayunis-core/ayunis-core/commit/12b974e2a2a5919f9bf0b301ec0d493eaeb3383e))
* enable model management for super admins and org default model TASK: AYC-38 ([cd79a50](https://github.com/ayunis-core/ayunis-core/commit/cd79a502f9ae8057d1705ad3ab25b25b7c954f64))
* enable name change for users ([315f040](https://github.com/ayunis-core/ayunis-core/commit/315f040982b91be910790aa47f40e33d7c9cb008))
* enable seeding of test data ([ec1171d](https://github.com/ayunis-core/ayunis-core/commit/ec1171d187d63ce8bd3a9d1d578916c7fd903baf))
* enable sidebar expand on mobile ([db08c75](https://github.com/ayunis-core/ayunis-core/commit/db08c7563999e82887b8feb21b9f00054cf2a21d))
* enable streaming for mistral ([a20fb50](https://github.com/ayunis-core/ayunis-core/commit/a20fb50f79b98bea0ce04a9c5f820fa7fbd7a6c8))
* enable thread rename ([#47](https://github.com/ayunis-core/ayunis-core/issues/47)) ([e1a7b37](https://github.com/ayunis-core/ayunis-core/commit/e1a7b378b6aaa14717cee02caab0d864bd389eda))
* enable user delete from CLI ([0a98a28](https://github.com/ayunis-core/ayunis-core/commit/0a98a2874b42e4ff06a33a9cee995f97a7eff42e))
* Enhance backend logging with user/request context AYC-000 ([8deddd1](https://github.com/ayunis-core/ayunis-core/commit/8deddd197fab7ebaff11a5633504bf54bfdb309f))
* fair use policy AYC-69 ([#65](https://github.com/ayunis-core/ayunis-core/issues/65)) ([c83186f](https://github.com/ayunis-core/ayunis-core/commit/c83186f54a87575af05260ee06eb98b8122e2f39))
* finalize first draft of MCP client ([107e009](https://github.com/ayunis-core/ayunis-core/commit/107e0098db3059241dec801d9edc69070bd42660))
* finalize subscription button ([2f2dcdd](https://github.com/ayunis-core/ayunis-core/commit/2f2dcdd97872d43744a55624723a8f4f981816a9))
* finalize webhooks ([71107b0](https://github.com/ayunis-core/ayunis-core/commit/71107b09d0440bcac96757b545ed1754636d0998))
* finish document handling ([80dfc78](https://github.com/ayunis-core/ayunis-core/commit/80dfc78c7c2a6ee9a437a7a4f5e8a2c65823d984))
* fix source creation flow ([c9f2312](https://github.com/ayunis-core/ayunis-core/commit/c9f2312a435c9de9d073cfae57dd6ad8c932d247))
* hide integrations from agent if none exist ([04578af](https://github.com/ayunis-core/ayunis-core/commit/04578af25ebbe4baa60dc7cba72ca825e8dda4ee))
* hint user to embedding model on files disabled ([a0a84d7](https://github.com/ayunis-core/ayunis-core/commit/a0a84d7fc5a6873ec1c7b9f7408885e8a1a2ceb1))
* implement admin role check and enhance integration card UI ([39f720a](https://github.com/ayunis-core/ayunis-core/commit/39f720a5411233845a22441131e4079338704aeb))
* implement drag and drop for file upload AYC-000 ([#70](https://github.com/ayunis-core/ayunis-core/issues/70)) ([92aebd4](https://github.com/ayunis-core/ayunis-core/commit/92aebd4c5ee3786ce57c106635427b8acc8ed12c))
* improve abort and tool display ([cb01541](https://github.com/ayunis-core/ayunis-core/commit/cb015419038d5af7e64a449c4af72695543a9041))
* Improve agent and prompt button empty states AYC-000 ([92a7984](https://github.com/ayunis-core/ayunis-core/commit/92a798487ba9666fbdd3f5dc92e34c01416a8298))
* improve agent source add flow ([290386d](https://github.com/ayunis-core/ayunis-core/commit/290386d002ba6eb6e72af25a3bc8e2de3ff32957))
* improve chat message markdown styles ([725ad4d](https://github.com/ayunis-core/ayunis-core/commit/725ad4db86f9008e8bfa7830c55a0abf7ed5d44e))
* improve chat page data input ([36f06b9](https://github.com/ayunis-core/ayunis-core/commit/36f06b97d49b8f9d4c7f32f90b5a594f3429c35b))
* improve code block display ([ceb0ab1](https://github.com/ayunis-core/ayunis-core/commit/ceb0ab1b4c2c9cec9e7082fa9557ebf9d4245c50))
* improve code execution tool prompt ([c923c37](https://github.com/ayunis-core/ayunis-core/commit/c923c371209a9dfc24912c80e50acd9f16553c7f))
* improve docs ([eeb56f5](https://github.com/ayunis-core/ayunis-core/commit/eeb56f5452e270ba21e64afff4e352eac6aa87a9))
* improve email widget ([88d47b1](https://github.com/ayunis-core/ayunis-core/commit/88d47b181b5c4490edff9d2a014cb6dbf17bf9ae))
* improve error display on source creation AYC-000 ([#38](https://github.com/ayunis-core/ayunis-core/issues/38)) ([c41c6ed](https://github.com/ayunis-core/ayunis-core/commit/c41c6ed32b6b1e881dac7cadcec535e8e5bfb0ee))
* improve error handling in chats ([f5e7f32](https://github.com/ayunis-core/ayunis-core/commit/f5e7f3235d216280e347b372c9ead15396b09f0d))
* improve message layout ([314d63b](https://github.com/ayunis-core/ayunis-core/commit/314d63bfdef457af0913f15fec5863e1e27b3bdd))
* improve onboarding layout ([1f2f01f](https://github.com/ayunis-core/ayunis-core/commit/1f2f01fd1efb4f2d6bd4b2d84f47a45e5e2c97f3))
* improve onboarding layout ([5968fcb](https://github.com/ayunis-core/ayunis-core/commit/5968fcb4c5a2790ea3c0187a4daf26f718b2a6f8))
* improve onboarding layout with i18n and new design ([#54](https://github.com/ayunis-core/ayunis-core/issues/54)) ([c17fbbf](https://github.com/ayunis-core/ayunis-core/commit/c17fbbf1ef766b61d7e8312e48285e9d9c1757a9))
* improve pricing wording ([eb1f6bd](https://github.com/ayunis-core/ayunis-core/commit/eb1f6bd3e9ff02ec582c40d641dbb10c43498015))
* improve readme ([b808f76](https://github.com/ayunis-core/ayunis-core/commit/b808f767b448e385e1a897a9010d8ffbbe2925ff))
* improve scrolling behavior ([2fa98d9](https://github.com/ayunis-core/ayunis-core/commit/2fa98d93394a21057d0ccffe474d68c888e1a631))
* increase context for ollama inference handler ([8d3b0a5](https://github.com/ayunis-core/ayunis-core/commit/8d3b0a547a4e04ca7f33a2c3fd1785c57a2b69e2))
* increase default ollama context length ([d9e6f31](https://github.com/ayunis-core/ayunis-core/commit/d9e6f317f633d696993d2d013298b98be433d637))
* increase max iterations to 20 ([7ae533e](https://github.com/ayunis-core/ayunis-core/commit/7ae533e2f287ca12e21afdb06e4172da089918ce))
* integrate code generation and finalize docs from llms ([65486bc](https://github.com/ayunis-core/ayunis-core/commit/65486bc5bc1feed5b4b637151832bb2f5ffb91e6))
* make agent card clickable ([cf7ee4c](https://github.com/ayunis-core/ayunis-core/commit/cf7ee4c96bcd9ccc2bd964cd2cfcaa2bc584b746))
* make agent dialog resizable ([c6ad6de](https://github.com/ayunis-core/ayunis-core/commit/c6ad6de9c462e5936921e1665c02f49762f3c3ec))
* make brave internet search work ([e0ee18e](https://github.com/ayunis-core/ayunis-core/commit/e0ee18e5a4666e87af330e5946511093082f12af))
* make embedding dimensions flexible ([0aa57a4](https://github.com/ayunis-core/ayunis-core/commit/0aa57a4115d7419177b3679f5aaa24a8946bd1a0))
* memo Markdown component ([e5218b1](https://github.com/ayunis-core/ayunis-core/commit/e5218b1720197fe3d79e5f863cb50fb203c99087))
* merge CLAUDE & AGENTS AYC-000 ([0c0b029](https://github.com/ayunis-core/ayunis-core/commit/0c0b029132065918235e1ef5d0023ed854a4df7b))
* merge repositories ([abd32dc](https://github.com/ayunis-core/ayunis-core/commit/abd32dc463315572027d3b73edc8b5aa11db36ee))
* migrate openai to new response endpoint ([db1525b](https://github.com/ayunis-core/ayunis-core/commit/db1525b96272f1117fb581566b42090f627ddc98))
* minor mcp improvements ([d92cec1](https://github.com/ayunis-core/ayunis-core/commit/d92cec1a9c76fe179220ed9ca295513c3c50a019))
* password visibility toggle ([#62](https://github.com/ayunis-core/ayunis-core/issues/62)) ([5ac605a](https://github.com/ayunis-core/ayunis-core/commit/5ac605a8a3139d3aa071e213e788162828946971))
* Preserve emojis when pasting into chat input ([#26](https://github.com/ayunis-core/ayunis-core/issues/26)) ([81f3aab](https://github.com/ayunis-core/ayunis-core/commit/81f3aabbaccd00d4865c18b826b421be984ff7c1))
* reconnect to thread before message send ([68fffed](https://github.com/ayunis-core/ayunis-core/commit/68fffed4f2202f625b16ad2bb00b981c6cdecaaf))
* redesign chat input ([ec074f3](https://github.com/ayunis-core/ayunis-core/commit/ec074f388e39fdc47d226e6917f0309889f2dd45))
* refresh token in guard if expired ([7259bfa](https://github.com/ayunis-core/ayunis-core/commit/7259bfaf9a57d2bde058a35d656af0677be49ac3))
* remove badges ([6bbdfa5](https://github.com/ayunis-core/ayunis-core/commit/6bbdfa570108ccd8a29b4e14b46f31f241009437))
* remove non implemented functionality from chat input ([0ac250d](https://github.com/ayunis-core/ayunis-core/commit/0ac250d4ebf49740074dd5b6e56b9bef946ea714))
* remove unfinished models ([896fcb1](https://github.com/ayunis-core/ayunis-core/commit/896fcb1e0920e5dff91a06f655994bc86759a8bc))
* return invite accept url to frontend when no email config present ([bf43ff3](https://github.com/ayunis-core/ayunis-core/commit/bf43ff3e63e375e1d29aa85ae7b5dd43f86d8e1b))
* show price when creating a subscription ([8c2b9df](https://github.com/ayunis-core/ayunis-core/commit/8c2b9dfeb3bfacf5e939f40bc647c0b62d658580))
* skip legal acceptance checks for self hosters ([50ee0c9](https://github.com/ayunis-core/ayunis-core/commit/50ee0c94f7f93fc10b0156d558d4a000a607805d))
* small design improvements ([e9f6e7f](https://github.com/ayunis-core/ayunis-core/commit/e9f6e7f200efcf5a3a2c738f2034dc8ae3dd3c03))
* sort models by country first ([00d5783](https://github.com/ayunis-core/ayunis-core/commit/00d5783d0c483f420afce7978d8f789babdf36eb))
* Strip markdown from generated thread titles ([#42](https://github.com/ayunis-core/ayunis-core/issues/42)) ([c5fd2c6](https://github.com/ayunis-core/ayunis-core/commit/c5fd2c6e7fe3e143e351ce89b64f9d696405e02d))
* **subscription:** add trial message limit configuration and entity ([99dbad7](https://github.com/ayunis-core/ayunis-core/commit/99dbad70f453b8c9902272e530cf7b28b4560644))
* **subscriptions:** implement domain-specific error handling for trial operations ([4625a5c](https://github.com/ayunis-core/ayunis-core/commit/4625a5c6c608091c282314fd4b8f97db8d95b2f6))
* trim context to 80k, show warning on long chats AYC-68 ([#60](https://github.com/ayunis-core/ayunis-core/issues/60)) ([a75783e](https://github.com/ayunis-core/ayunis-core/commit/a75783e6c59022323e484c3fd5b0dfd21203d286))
* update chart components with new features ([049d9ff](https://github.com/ayunis-core/ayunis-core/commit/049d9ff93b19e8ceaa3fd6cf31af325edfa19255))
* update example env ([ff5ebbe](https://github.com/ayunis-core/ayunis-core/commit/ff5ebbed95c4c5eb7c24b066c4f7dbfa170696d6))
* update privacy policy link ([06a0b61](https://github.com/ayunis-core/ayunis-core/commit/06a0b61b336c3056780f99412bec0cfae0fd8833))
* update readme to include example models ([e90a088](https://github.com/ayunis-core/ayunis-core/commit/e90a08825ce2bf4fe0e2cea445252dd87f373fde))
* use id of model instead of name and provider ([7260569](https://github.com/ayunis-core/ayunis-core/commit/7260569c77a3ec33c2d423de9149156c1dbc5834))


### Bug Fixes

* add buffer time on reconnect ([98ef20a](https://github.com/ayunis-core/ayunis-core/commit/98ef20ae142e915ff02abb25cbdfdbb6f67e635c))
* add cross-platform favicons ([82cc8cd](https://github.com/ayunis-core/ayunis-core/commit/82cc8cd81de24e6a49a7f6c0959ea4fa08ec0c8d))
* add current model to blacklist on agent model replace ([2404845](https://github.com/ayunis-core/ayunis-core/commit/24048456e4f458a54e4a6ff4a40e24f3d2bbf08c))
* add fallback for uuid in http context ([2c09c2d](https://github.com/ayunis-core/ayunis-core/commit/2c09c2d36a90b88c3e00d793b87c26514e89fb26))
* add legal links to onboarding layout ([ae4846a](https://github.com/ayunis-core/ayunis-core/commit/ae4846a661180c3868a67e879c69cab78b291485))
* add markdown hint to system prompt AYC-000 ([f452784](https://github.com/ayunis-core/ayunis-core/commit/f452784955bff93259614328ed1cde49dff90ccc))
* add max height to chat input ([362f1c4](https://github.com/ayunis-core/ayunis-core/commit/362f1c4c4699006984b13257c7ac35876cc0e676))
* add migration for optional inviter ([a7ce48c](https://github.com/ayunis-core/ayunis-core/commit/a7ce48c025db5242bc9d1cc5f2e6d42961d21137))
* add missing header ([5ee3757](https://github.com/ayunis-core/ayunis-core/commit/5ee375700a624292114d5772552d0b32e1ba8da1))
* add missing translation ([d28bd8b](https://github.com/ayunis-core/ayunis-core/commit/d28bd8b3787234dd5fbaad997fed10657f4f3e11))
* add missing translations ([321f241](https://github.com/ayunis-core/ayunis-core/commit/321f2411e5ec224a43d4fbc8c6ddec8aaa4ea8c3))
* add missing translations ([04b6575](https://github.com/ayunis-core/ayunis-core/commit/04b6575c95817f9b00c746ca9c342fff78feef8b))
* add missing translations ([995de48](https://github.com/ayunis-core/ayunis-core/commit/995de48b9bf67f1cd18c193938189d1a9539f02f))
* add missing use case to model module ([836ed26](https://github.com/ayunis-core/ayunis-core/commit/836ed26e1f3d4ca565bb18ac16598f13ee71a5a6))
* add missing user error ([054b4ee](https://github.com/ayunis-core/ayunis-core/commit/054b4ee6827cd28c0af402eafa56a1689c2d0aec))
* add npm ci step to GitHub Actions workflow ([ce3fb98](https://github.com/ayunis-core/ayunis-core/commit/ce3fb9816406a6e04ef4e9049c53e54d73f2870c))
* add permissions for code generation ([b3f1794](https://github.com/ayunis-core/ayunis-core/commit/b3f1794e566693c8417cbc0f355127751162588d))
* Add proper names and description for Legal MCP AYC-000 ([f3a0324](https://github.com/ayunis-core/ayunis-core/commit/f3a03247ad11264a692acbc793def82e29e6b5f9))
* add query keys to update mutations ([3548202](https://github.com/ayunis-core/ayunis-core/commit/3548202f52eb11839e64cea177e1c65f52e64999))
* add required props to openai normalization AYC-58 ([6fe9e88](https://github.com/ayunis-core/ayunis-core/commit/6fe9e88c765f9e5cfe7f6859685726dd2fa713d8))
* add rollback mechanism after cancel and error ([34ce80b](https://github.com/ayunis-core/ayunis-core/commit/34ce80bdbdd52ea5be222deae5fae4c8ff961fc4))
* add separate host port ([ad4fcde](https://github.com/ayunis-core/ayunis-core/commit/ad4fcde6add182f42b85a23cbc425c7481859fb3))
* add timeout config to docker proxy ([8fefa2d](https://github.com/ayunis-core/ayunis-core/commit/8fefa2d52bc2a5738f90444720878f899f08c8f8))
* add tools to ollama ([421e8b4](https://github.com/ayunis-core/ayunis-core/commit/421e8b4cc853e2539fcf8788ff37645cb9828e81))
* adjust code execution prompt AYC-000 ([#37](https://github.com/ayunis-core/ayunis-core/issues/37)) ([b5239a5](https://github.com/ayunis-core/ayunis-core/commit/b5239a57b1561bf3b65bd9ebda874efd9df396ae))
* adjust code execution tool description AYC-000 ([a5516bf](https://github.com/ayunis-core/ayunis-core/commit/a5516bf01e497f0be1d8a39a8b809138b88e9de5))
* adjust consent defaults ([8e96af2](https://github.com/ayunis-core/ayunis-core/commit/8e96af218dda01cd670336f48ec66113865360ba))
* adjust license badge ([c70d2f9](https://github.com/ayunis-core/ayunis-core/commit/c70d2f9e3484ee58ed02f727e75b3015a1a761bf))
* adjust message streaming logic ([b338745](https://github.com/ayunis-core/ayunis-core/commit/b3387450cfe43b34caf2a1764f6f4ccddb3ba951))
* admin check for deleting users ([ac05098](https://github.com/ayunis-core/ayunis-core/commit/ac05098644e2617113b2b1ad6cd09fe334c4f61c))
* automatically run migrations on startup ([82826cd](https://github.com/ayunis-core/ayunis-core/commit/82826cd3cc9230f9c6de4b762d606070b2479d52))
* avoid connection loss for inactive tabs ([3657808](https://github.com/ayunis-core/ayunis-core/commit/36578083aec1bfeb564cfae56dcc9bc74dc02861))
* calendar widget review notes. ([33ef81c](https://github.com/ayunis-core/ayunis-core/commit/33ef81c0540c13a61898915d667a149889c1b07e))
* cascade legal acceptance delete on user delete ([c354d92](https://github.com/ayunis-core/ayunis-core/commit/c354d9284a0a13d97e32cf1a233c22b394f4df70))
* **chat-input:** fix add prompt item alignment in plus button menu ([#67](https://github.com/ayunis-core/ayunis-core/issues/67)) ([1b78bd5](https://github.com/ayunis-core/ayunis-core/commit/1b78bd544fc4d4c31f8ff0b0eb63faf63e4dfa4d))
* check createdBy added in migrations ([f9f8ec7](https://github.com/ayunis-core/ayunis-core/commit/f9f8ec7287b60c185007e36572eeaf428d463f47))
* check email before creating and accepting invites ([220c9fe](https://github.com/ayunis-core/ayunis-core/commit/220c9fe0986038f155b7790730fe92532e721db2))
* check partially migrated enum ([1d940fb](https://github.com/ayunis-core/ayunis-core/commit/1d940fb31031538edb7acca7f45a5ca4840f4efd))
* check password validity on invite accept ([b17ae20](https://github.com/ayunis-core/ayunis-core/commit/b17ae20d7e0cc8f687bedf4ce06049ce37072f63))
* check provider permission on model permission create ([df8ebcf](https://github.com/ayunis-core/ayunis-core/commit/df8ebcfa8c63bbfc0b96907d436cdd685e478ff2))
* close thinking block on tool use message content ([f75a535](https://github.com/ayunis-core/ayunis-core/commit/f75a535576dc22a795ce37115263a8b312306f46))
* code style ([7957ef3](https://github.com/ayunis-core/ayunis-core/commit/7957ef39e8d2e2a9384ab7ec5350e963b95e3dcc))
* correct customer number ([a19a6a5](https://github.com/ayunis-core/ayunis-core/commit/a19a6a5f319081e8505ab5c50b7be57319ec110b))
* correct dist paths in package.json scripts ([b61d23c](https://github.com/ayunis-core/ayunis-core/commit/b61d23c7cca94a8fbb8a8c4e4fdd3c4c85f78850))
* correct entry point path in Dockerfile.test ([c98cea6](https://github.com/ayunis-core/ayunis-core/commit/c98cea605bbcaf469a0e74daf4d1d9faf9afff21))
* correct frontend build path in Dockerfile.test ([fbb49e7](https://github.com/ayunis-core/ayunis-core/commit/fbb49e7c21b353c3a241bac252480b0823756b56))
* create pgvector extension in first migration ([c6a85f8](https://github.com/ayunis-core/ayunis-core/commit/c6a85f86c729193efbbf771df96da920ffab7036))
* delete invite if user gets deleted ([b946ad6](https://github.com/ayunis-core/ayunis-core/commit/b946ad6e3e4a1b45180fd9ff9d892a296f419ff6))
* display text in widgets ([afa376f](https://github.com/ayunis-core/ayunis-core/commit/afa376f068ffc4a315a0bab31941f8a1681b8d54))
* docker build and structure ([9af5828](https://github.com/ayunis-core/ayunis-core/commit/9af5828f23d99cdf2f91a0b4422aad09fba41e7d))
* don't expose unused minio ports ([dfcd4dc](https://github.com/ayunis-core/ayunis-core/commit/dfcd4dc8af4822b219e2ebb52494806b8bef80b2))
* don't require legal acceptance for ayunis provider ([37222ef](https://github.com/ayunis-core/ayunis-core/commit/37222ef6d4cc436eb900230bf19b6c69f1288d30))
* E2E tests passing with improved mock handlers and test expectations ([37ab25a](https://github.com/ayunis-core/ayunis-core/commit/37ab25a45b1d1ba81c7b1c8812fb80794ca5e263))
* end ollama stream when chunk contains done ([d208647](https://github.com/ayunis-core/ayunis-core/commit/d2086471fc2f4ccc672bad5f79b5fcebe4587da6))
* fetch auth query with cache ([8b2fc8e](https://github.com/ayunis-core/ayunis-core/commit/8b2fc8e5e25311999cfafbb19e6f3cd2a7593659))
* fix agent source mapping ([6a658da](https://github.com/ayunis-core/ayunis-core/commit/6a658dae927f02ab4d273e96fb71a6d24e954f35))
* Fix Ayunis Core translation AYC-000 ([4668583](https://github.com/ayunis-core/ayunis-core/commit/4668583a1934ac58a5a141f6cea20b1a019a7f48))
* fix build ([a44d33e](https://github.com/ayunis-core/ayunis-core/commit/a44d33e636628299a777921872eb2ad7d3e4aeee))
* fix cache handling in provider management ([57d0b39](https://github.com/ayunis-core/ayunis-core/commit/57d0b3964e86ad09f9b06313f72481d4e1e370b0))
* fix caching issue in chats ([bf0bb02](https://github.com/ayunis-core/ayunis-core/commit/bf0bb023ee3e3f3c07c5aacf6f0665156b1f124c))
* fix caching issue when creating prompt ([f6133a6](https://github.com/ayunis-core/ayunis-core/commit/f6133a6adf5ee14f8a13611b22e0389b23b4333b))
* fix caching issues on thread create ([0be1978](https://github.com/ayunis-core/ayunis-core/commit/0be19787d9379f871b705e0da014e95c86ac27a9))
* fix caching keys ([b799a69](https://github.com/ayunis-core/ayunis-core/commit/b799a69a21f3edc18c172833a883a4707e1d3dd3))
* fix cascading on delete AYC-000 ([#34](https://github.com/ayunis-core/ayunis-core/issues/34)) ([fea0fcc](https://github.com/ayunis-core/ayunis-core/commit/fea0fccabb077f7c7f922bc0e44d277c374ea5f5))
* fix chat message ordering and encoding ([690af54](https://github.com/ayunis-core/ayunis-core/commit/690af541479a5f09bb840543b1d3d3140ddf875d))
* fix cleanup and add announcable org id as env variable AYC-000 ([#51](https://github.com/ayunis-core/ayunis-core/issues/51)) ([933dbe5](https://github.com/ayunis-core/ayunis-core/commit/933dbe5b8d8eafbe45fad22ad08f8c54f71ac94f))
* fix cli module imports AYC-000 ([fc80ea1](https://github.com/ayunis-core/ayunis-core/commit/fc80ea1d2dcc10afb6dcd375bc08d7abaf33704d))
* fix code execution tool input to be compatible to openai ([a48aae6](https://github.com/ayunis-core/ayunis-core/commit/a48aae60bcd47e9640c107c3aec1812d00d08c87))
* Fix confirm modal closing ([#24](https://github.com/ayunis-core/ayunis-core/issues/24)) ([f4bd4fd](https://github.com/ayunis-core/ayunis-core/commit/f4bd4fd988e1c6fe1c4733bb66b47ae329ad6b5b))
* fix confirmation modals AYC-000 ([#35](https://github.com/ayunis-core/ayunis-core/issues/35)) ([4ae9aca](https://github.com/ayunis-core/ayunis-core/commit/4ae9acaff2bde03ed10d5d3517bdc0751bed4554))
* fix cors ([f95f15e](https://github.com/ayunis-core/ayunis-core/commit/f95f15ed6d038b0b7ad5af350bae40ae63507538))
* fix email template inviter name handling ([f5848dc](https://github.com/ayunis-core/ayunis-core/commit/f5848dc91aef3c738057e6bb2d5f9c80ba0f4086))
* fix env variable mapping ([1824417](https://github.com/ayunis-core/ayunis-core/commit/182441760a9739ac8d740d4614903fa3d6e35d1a))
* fix formatting TASK: AYC-38 ([4c81be8](https://github.com/ayunis-core/ayunis-core/commit/4c81be84612e602c4ee12697682af1f02f4e97a7))
* fix function annotation ([753ab1c](https://github.com/ayunis-core/ayunis-core/commit/753ab1c0c96ef83189549926fe5d5850afde6b1f))
* fix height of textarea ([00f7a4a](https://github.com/ayunis-core/ayunis-core/commit/00f7a4a1a2e6c63ea56ad1d645cca5e18ec846c6))
* fix host and container port env substitution ([8e83a10](https://github.com/ayunis-core/ayunis-core/commit/8e83a1011f0f03601312f394091776bb89247f5c))
* fix ID type for legal acceptance references ([a8e2122](https://github.com/ayunis-core/ayunis-core/commit/a8e21222232356567aa950e47c7150292da679b7))
* fix idee assignment of child chunks ([b2132fa](https://github.com/ayunis-core/ayunis-core/commit/b2132fa791207ed5e08e23e2b5546e4166f00597))
* fix invite flow ([#68](https://github.com/ayunis-core/ayunis-core/issues/68)) ([33028fa](https://github.com/ayunis-core/ayunis-core/commit/33028faadcfcb5fa2c09119f77542c30db0ef3f4))
* fix key of multiple tool calls ([f32a3a3](https://github.com/ayunis-core/ayunis-core/commit/f32a3a39a56c2cd056089659373667985ee3b1d0))
* fix label display on pie charts ([c47be86](https://github.com/ayunis-core/ayunis-core/commit/c47be86ce10c745861598d957a189ed88f8f2c26))
* fix layout issues on wider code blocks ([51c5084](https://github.com/ayunis-core/ayunis-core/commit/51c5084fb8548e6671e313a358b9307310a814df))
* fix linting and tsx errors TASK: AYC-000 ([6c62685](https://github.com/ayunis-core/ayunis-core/commit/6c6268521ff8fa602819e113cf59e652ab52d6f5))
* fix linting error ([a6cba4d](https://github.com/ayunis-core/ayunis-core/commit/a6cba4db6632314f38ba0d676594c467607d066d))
* fix linting errors ([6dfdf68](https://github.com/ayunis-core/ayunis-core/commit/6dfdf684a3d8f762dcf18c41c9a248c505c41c59))
* fix linting errors ([5b3cd55](https://github.com/ayunis-core/ayunis-core/commit/5b3cd5574e54ec8b751bc516b4d082738a402c78))
* fix location of frontend in build ([cb2f472](https://github.com/ayunis-core/ayunis-core/commit/cb2f4729d5ca83606dfd76b6eaaa8e04acdf4be7))
* fix mapper for non existent chunks ([38e29c3](https://github.com/ayunis-core/ayunis-core/commit/38e29c3f4da97415752df9765e0e3b15c6ee31be))
* fix migraiton ([e393df6](https://github.com/ayunis-core/ayunis-core/commit/e393df6e54f60cf967bb23e93e621db5e66be2d5))
* fix migration ([5e148bb](https://github.com/ayunis-core/ayunis-core/commit/5e148bb12128994f1a60b6904a016a5bea8f3edd))
* fix migration ([bdb6216](https://github.com/ayunis-core/ayunis-core/commit/bdb621670fd53f6566799369cfb3b1b4210c6e6b))
* Fix model creation and max tokens ([ac13e55](https://github.com/ayunis-core/ayunis-core/commit/ac13e5544b76dd142adf3c03cbc7475ab66a7a2f))
* fix naming, remove thinking from thread title response ([024e8ab](https://github.com/ayunis-core/ayunis-core/commit/024e8ab3c696dc4d71197d52398c210af2013f01))
* fix optimistic update on user default model ([bf1df26](https://github.com/ayunis-core/ayunis-core/commit/bf1df2658ce2b8444ef9bc7a3731ed8bc5b1aae0))
* fix overlay issue on chrome ([a54f90d](https://github.com/ayunis-core/ayunis-core/commit/a54f90dfd73ae9603e9673457f976c11d1a163d6))
* fix permitted model and provider deletion ([3c95aa1](https://github.com/ayunis-core/ayunis-core/commit/3c95aa101b49bf6d45e871407906711253fb9e2c))
* fix permitted provider record ([1d2505b](https://github.com/ayunis-core/ayunis-core/commit/1d2505bd0248c6e83b024d01788f0208b690f30c))
* fix pg healthcheck ([a5a0ef0](https://github.com/ayunis-core/ayunis-core/commit/a5a0ef018e4c04356950b71ce95096faea4151b5))
* fix pg healthcheck again ([208f268](https://github.com/ayunis-core/ayunis-core/commit/208f268dfc5dd01d80866cdf2113acf1ea045e1a))
* fix pg healthcheck again ([e9eca7d](https://github.com/ayunis-core/ayunis-core/commit/e9eca7d2d6b10527ecd4cf6b4c35f235c1a7b388))
* fix pg healthcheck again ([3f5587c](https://github.com/ayunis-core/ayunis-core/commit/3f5587c75a8a710224c84098dccdb6e739a6b848))
* fix pg healthcheck again ([2951343](https://github.com/ayunis-core/ayunis-core/commit/2951343d4535d742d544adbfb6dc149413c14be8))
* fix pg healthcheck again ([2d6acd4](https://github.com/ayunis-core/ayunis-core/commit/2d6acd4f75f7a068b905ec3413f33c0a8c4ed8c6))
* fix pg healthcheck again ([9414fbb](https://github.com/ayunis-core/ayunis-core/commit/9414fbb478428cdc09835b4d281c086b11dda75b))
* fix query key for prompt creation ([5b679dc](https://github.com/ayunis-core/ayunis-core/commit/5b679dc757d08fdd795ad89023fb93708e980006))
* fix query keys and remove console logs ([eccd94d](https://github.com/ayunis-core/ayunis-core/commit/eccd94d53e470e65efd8347c362597d6a428d55e))
* fix query keys for updating models ([9931ccf](https://github.com/ayunis-core/ayunis-core/commit/9931ccf6c9f887f7a97e59454645a498a269df03))
* fix README ([752541b](https://github.com/ayunis-core/ayunis-core/commit/752541b502e2b975357f733d3dab55768735a6b6))
* fix redirect when not logged in ([4e035fc](https://github.com/ayunis-core/ayunis-core/commit/4e035fc5730f5ec6fc68ef66e2dd67636d9e6e26))
* fix registration wording and user name change caching ([128f00b](https://github.com/ayunis-core/ayunis-core/commit/128f00b1d48d29b6707f78fa046f959afb18e522))
* fix return type of get subscription use case ([1fddbe0](https://github.com/ayunis-core/ayunis-core/commit/1fddbe0f34cdae00b1f64c09300db96279cf56fd))
* fix shift enter command ([edb3aa3](https://github.com/ayunis-core/ayunis-core/commit/edb3aa302aac6073cf94361a95bd07603de2cdb6))
* fix shift+enter key for newline ([1fed868](https://github.com/ayunis-core/ayunis-core/commit/1fed8686510f63f7b1780d0dbd575f58dea0bafa))
* fix submit handlers in trial forms TASK: AYC-39 ([40d8421](https://github.com/ayunis-core/ayunis-core/commit/40d8421d3fee7886ac095c56190e1ccb40315de1))
* fix test ([8b8bb10](https://github.com/ayunis-core/ayunis-core/commit/8b8bb10a1826bf31fb940c85cf3c2828396adb05))
* fix tests ([dfc9349](https://github.com/ayunis-core/ayunis-core/commit/dfc934952044c75a8024de66b8d9304146817052))
* fix tests ([2d478f7](https://github.com/ayunis-core/ayunis-core/commit/2d478f7644a7b4b8791a2373cc038418a21cd4bc))
* fix text extraction for title set ([10ab867](https://github.com/ayunis-core/ayunis-core/commit/10ab86737491ef328b124d2568c5409dfe20f126))
* fix title set use case ([59cbc72](https://github.com/ayunis-core/ayunis-core/commit/59cbc723139e3864269b1939f3c731857fd43c9d))
* fix tool name display in chat ([24dfcb4](https://github.com/ayunis-core/ayunis-core/commit/24dfcb4148b7f7cb4a00f17a1592ff281cfa819f))
* fix translations in agent page ([cae6b98](https://github.com/ayunis-core/ayunis-core/commit/cae6b982af04eab4165f29e8635f3a618a5bf28f))
* fix type error ([d84c414](https://github.com/ayunis-core/ayunis-core/commit/d84c41450da1f6ddfcc3475ac483d6b706ec35e0))
* fix type in send email widget ([37f11f2](https://github.com/ayunis-core/ayunis-core/commit/37f11f29f9561e4cbdc8c2a562f3673debc810f1))
* fix types in chat input ([5f27140](https://github.com/ayunis-core/ayunis-core/commit/5f27140ab5357b22530b9ea3cc1bf9ddf04fc370))
* fix unassigned variables ([323626f](https://github.com/ayunis-core/ayunis-core/commit/323626f5cd9cd9e203d94e3b28cb5da20db8ac78))
* force additionalProperties false for openai AYC-000 ([#25](https://github.com/ayunis-core/ayunis-core/issues/25)) ([aef9fcb](https://github.com/ayunis-core/ayunis-core/commit/aef9fcb4e696075a87cf3465a1f6dc235aab9292))
* get source assignments with agents ([cec9585](https://github.com/ayunis-core/ayunis-core/commit/cec95851370b0ef821fb5f3c026e0fb9969bc9b0))
* handle empty sidebar after chat deletion in test ([eb13377](https://github.com/ayunis-core/ayunis-core/commit/eb1337725be92f75118939a809600eb9aaddd18d))
* i18n usage ([d69e5f3](https://github.com/ayunis-core/ayunis-core/commit/d69e5f3fb1a4bfa59c58792d0a3398e45e963a15))
* imprint in german ([8c49576](https://github.com/ayunis-core/ayunis-core/commit/8c49576dd5b1b50bd500c1b1ccbd6ef0881616ce))
* improve code execution prompt ([b9f86dd](https://github.com/ayunis-core/ayunis-core/commit/b9f86dda2623a77113650ced0a56299838f8fe46))
* improve docs ([5eadc23](https://github.com/ayunis-core/ayunis-core/commit/5eadc23a9d4e0c341cf7d493cab48a3e9fc9433a))
* improve error handling for creating permitted models ([a1dbf77](https://github.com/ayunis-core/ayunis-core/commit/a1dbf77ff21b89b98334be2c6a3ad9fe5d9f7cc7))
* improve onboarding copy ([c72ee19](https://github.com/ayunis-core/ayunis-core/commit/c72ee19f038413c5a736d44bb873451d7f76cccd))
* improve register user use case for self hosters ([8f2b0e1](https://github.com/ayunis-core/ayunis-core/commit/8f2b0e1bd8c39ed64345ffd1fe6443e9cda16afc))
* improve vector search queries ([a37f86f](https://github.com/ayunis-core/ayunis-core/commit/a37f86f807aacf1a71accf6a1ad97be32bcd38ca))
* increase max tokens of models ([ed76eb1](https://github.com/ayunis-core/ayunis-core/commit/ed76eb1359fccabf7aabc164369e356f66075c90))
* keep connection on unfocused browser tab ([27e7910](https://github.com/ayunis-core/ayunis-core/commit/27e7910bf21d118a0ad9da5225daba9d193fea9b))
* linting errors ([53fc6e9](https://github.com/ayunis-core/ayunis-core/commit/53fc6e95d8fcddb5c75ad5e6afa0872a0427caaa))
* linting errors ([2aa2ae5](https://github.com/ayunis-core/ayunis-core/commit/2aa2ae56ad18bcf67d39468b78a27a776d305ca4))
* localize auth form errors ([30388d9](https://github.com/ayunis-core/ayunis-core/commit/30388d9e290038771cd58946b8d439a2c4405f24))
* make de default language ([cff8c14](https://github.com/ayunis-core/ayunis-core/commit/cff8c14b064c10807bae28c11303e6bc0987e3ea))
* make email blacklist independent from country ([b15362f](https://github.com/ayunis-core/ayunis-core/commit/b15362f9ccfdb9b477bed2c986474920a456e7f1))
* make email check case insensitive ([5fefdb6](https://github.com/ayunis-core/ayunis-core/commit/5fefdb6942894bf349efbd72a24997450d428a3f))
* make height of textarea fixed ([76d9ff3](https://github.com/ayunis-core/ayunis-core/commit/76d9ff37971e1b28546b1c0202f9b0fdf5f301a5))
* make inviter optional ([4f67919](https://github.com/ayunis-core/ayunis-core/commit/4f679193a352ffcd60cf350bfe36c3670ae91307))
* make pw guidelines more obvious ([cbc52fc](https://github.com/ayunis-core/ayunis-core/commit/cbc52fc8e7b9f071478b19e8201afe6808cfd86f))
* make sure default is german language ([47a35a8](https://github.com/ayunis-core/ayunis-core/commit/47a35a8a412f509a30ffbc7f67deffbdd91a8c52))
* make update use case injectable ([5c57379](https://github.com/ayunis-core/ayunis-core/commit/5c57379bafde969a61ed1a1917e8583e2bcd1e86))
* minor fixes ([9eba137](https://github.com/ayunis-core/ayunis-core/commit/9eba137160c92f0e4cd009897bf44f4e753a5855))
* minor fixes ([e4675fd](https://github.com/ayunis-core/ayunis-core/commit/e4675fd4f386b9685aaf2e012c12ec1fe073df09))
* minor README changes ([9b585c7](https://github.com/ayunis-core/ayunis-core/commit/9b585c7fc2499eda65f4247a993ae28ad01efad2))
* normalize schema for response api AYC-58 ([6f60dd9](https://github.com/ayunis-core/ayunis-core/commit/6f60dd9d34c86e7b966ef800e248d8068359295a))
* only add resoning effort for gpt 5 models ([06a8f93](https://github.com/ayunis-core/ayunis-core/commit/06a8f9328cf3ef9ef3b2dc35bb5df153d0f31b09))
* only allow predefined integrations in cloud env ([2e80878](https://github.com/ayunis-core/ayunis-core/commit/2e8087893b1ad63fe98d693890018549c705ff89))
* only yield if content available and finish if stop reason ([7af284c](https://github.com/ayunis-core/ayunis-core/commit/7af284c25356bec143f7f32cb85c62070582ec52))
* postpone superadmin migration ([b5fbfa0](https://github.com/ayunis-core/ayunis-core/commit/b5fbfa0358e26a6f734e0c5b8356ec8acbdc9954))
* preserve chat message on init chat error ([3ebc0b5](https://github.com/ayunis-core/ayunis-core/commit/3ebc0b530282aaf569e2ecf34f403edea3ff7ff1))
* preserve integrations and sources on agent update AYC-53 ([5c7ff55](https://github.com/ayunis-core/ayunis-core/commit/5c7ff55642e2cc0c6ef4bb6a511ec106138274d7))
* preserve message on send error ([a95c5ee](https://github.com/ayunis-core/ayunis-core/commit/a95c5ee905598ca591278a10b9bb52c254df8915))
* properly propagate retriever errors ([40c2f82](https://github.com/ayunis-core/ayunis-core/commit/40c2f828c56c2aff74f9c15cb8a9d4849b62ce7d))
* provide internet search tool only if available ([bb03638](https://github.com/ayunis-core/ayunis-core/commit/bb0363855a831719c7eafe01b15663f88a7e1570))
* reduce thinking effort ([e24de10](https://github.com/ayunis-core/ayunis-core/commit/e24de10b4cdb4b11211964b18b77be8191bb727f))
* remove autoblocker script ([90dd704](https://github.com/ayunis-core/ayunis-core/commit/90dd704960f6ec89dd95b47872f201ff3e70b613))
* remove callbaks ([3124a67](https://github.com/ayunis-core/ayunis-core/commit/3124a674aa2f3ec04e47a55aceb373cd90eb17a6))
* remove console log ([f62be0d](https://github.com/ayunis-core/ayunis-core/commit/f62be0d964ab2f489d1f7bbdbb5e858a64b30ba0))
* remove deleted import ([f618372](https://github.com/ayunis-core/ayunis-core/commit/f6183725feb4f31b04d5fe07e8689dd1861a66c5))
* remove encrypted content in openai handler for now ([548f256](https://github.com/ayunis-core/ayunis-core/commit/548f2569b82ea774be8497f0fecaa9f68918f4b3))
* remove language detection for now ([6920124](https://github.com/ayunis-core/ayunis-core/commit/692012484dc99ca6197a0459fc941996588eb44a))
* remove logs from inference handler registry ([bed87d4](https://github.com/ayunis-core/ayunis-core/commit/bed87d4fc2994d020200550cdaa3f82ead3f4138))
* remove long links from onboarding emails ([85bfa40](https://github.com/ayunis-core/ayunis-core/commit/85bfa406442a7d4ab369103e74eb91daebe68e9e))
* remove registration controller logs ([1d4e440](https://github.com/ayunis-core/ayunis-core/commit/1d4e440b101bb8e23596d38ef868fe7549a4b28c))
* remove unnecessary log ([120855c](https://github.com/ayunis-core/ayunis-core/commit/120855ca0a4738c04712132a6419ca6246502491))
* remove unnecessary log ([11add2b](https://github.com/ayunis-core/ayunis-core/commit/11add2b02c05a9805d3a6ca3e5d099540bf76105))
* render fallback on invalid tool input in widget ([d49739f](https://github.com/ayunis-core/ayunis-core/commit/d49739fd2bc97aeef5e2987014d8764848c546fb))
* resolve testing pipeline blockers (seeding and mock handlers) ([5ab1504](https://github.com/ayunis-core/ayunis-core/commit/5ab1504ab4e63082b953fd6c322c390982850a10))
* respect all thinking responses from ollama ([98f0d85](https://github.com/ayunis-core/ayunis-core/commit/98f0d85a4684b1b7d98cd3fa4530b5f958cbda2e))
* retrieve user default model ([906b350](https://github.com/ayunis-core/ayunis-core/commit/906b350eaf2fbc2c413849875e2539036e868e35))
* revert trial create for superadmins ([5d75f23](https://github.com/ayunis-core/ayunis-core/commit/5d75f23b7d9b7924f2ffc6bb038606953b16575e))
* sanitize null bytes in sources AYC-000 ([70e7d4e](https://github.com/ayunis-core/ayunis-core/commit/70e7d4ef33c462a1448be15ed02161f656424f65))
* set inviter nullable ([02a8cc1](https://github.com/ayunis-core/ayunis-core/commit/02a8cc19fbd2def103f6cebc8219d31d8e6e11af))
* show error message for invite accept errors ([b93ed67](https://github.com/ayunis-core/ayunis-core/commit/b93ed67765d29c24db3e5b7a51cb4dd02242b191))
* show password hint on invalid pw ([6e0931a](https://github.com/ayunis-core/ayunis-core/commit/6e0931a1fb429b913aa4e6755bec8d9648b7b57d))
* show specific error when deleting default model ([#58](https://github.com/ayunis-core/ayunis-core/issues/58)) ([b6ac11b](https://github.com/ayunis-core/ayunis-core/commit/b6ac11b7c56d7a00e180f29f6d5ce55eac80b7dc))
* switch to stateless SSE without session ([8287628](https://github.com/ayunis-core/ayunis-core/commit/82876283b0d941c5de1ce98e4edfdedd764a60ac))
* tell model if tool use was invalid instead of erroring out ([2133127](https://github.com/ayunis-core/ayunis-core/commit/2133127bae0b2655c4acf63bb4cbacef52aab564))
* thread sorting after pagination ([#61](https://github.com/ayunis-core/ayunis-core/issues/61)) ([b275bf0](https://github.com/ayunis-core/ayunis-core/commit/b275bf03dc20c39b78f6f5930d0f2d4f28073bf3))
* Update CMD to point to correct main.js location ([16f063c](https://github.com/ayunis-core/ayunis-core/commit/16f063cfe9ac1568a002ec5c1feeaa6ce642d873))
* update Cypress selectors for model dropdown ([447014a](https://github.com/ayunis-core/ayunis-core/commit/447014a5bf36157a0eae1cfb392fff66ce2f0593))
* update data privacy link. ([29f5cdc](https://github.com/ayunis-core/ayunis-core/commit/29f5cdce193ce6327584063574f99868596158da))
* update key assignment in BarChartWidget and LineChartWidget for unique identification ([66ff119](https://github.com/ayunis-core/ayunis-core/commit/66ff119ed135ec74d8abc61aca45989e4ca8927c))
* update openapi schema AYC-000 ([fbc3d85](https://github.com/ayunis-core/ayunis-core/commit/fbc3d857f59ce394175adf7519cf6cf2d626339d))
* update thread list after delete ([313d47a](https://github.com/ayunis-core/ayunis-core/commit/313d47af90c667a2f2fca3a8c69e2f134e025810))
* various improvements ([d5ccb76](https://github.com/ayunis-core/ayunis-core/commit/d5ccb76067dc34730828ddb07ceee8c2971f8635))
* various small improvements ([cc5c73a](https://github.com/ayunis-core/ayunis-core/commit/cc5c73ac1ec3b4b9a7f1f013a0460f7e79c7331a))


### Code Refactoring

* extract model selection in separate function ([660e340](https://github.com/ayunis-core/ayunis-core/commit/660e34078f4be7ef37100d51726100edde2ce365))
* Improve code structure ([b13e0df](https://github.com/ayunis-core/ayunis-core/commit/b13e0df79b884d46be3d727636a55d48215d523b))
* Improve rename thread dialog focus behavior ([#50](https://github.com/ayunis-core/ayunis-core/issues/50)) ([8e68388](https://github.com/ayunis-core/ayunis-core/commit/8e683888a3fb6628842fdc7fd0d514fd98e4da1d))
* Improve tool parameter validation and error handling ([#40](https://github.com/ayunis-core/ayunis-core/issues/40)) ([2453f15](https://github.com/ayunis-core/ayunis-core/commit/2453f15925186fb016932b987e8d078240835162))
* remove unused Label import in PasswordSettingsPage ([495a115](https://github.com/ayunis-core/ayunis-core/commit/495a1155626dd5fcf47d663ae95874c9be2ab88d))
* remove unused Label import in PasswordSettingsPage ([bec16c4](https://github.com/ayunis-core/ayunis-core/commit/bec16c4a0cc45d903d86ef0f630a84333c72c8ca))
* split sources into text vs data ([10dac72](https://github.com/ayunis-core/ayunis-core/commit/10dac72a4d57890d4240acdbead9d5bcdd5f4eae))
* split trial and subscription functionality into separate modules TASK: AYC-39 ([3584faa](https://github.com/ayunis-core/ayunis-core/commit/3584faa6b685eabf71e0d0ae2f5940c3d8862dc5))
* stream response before generating title ([9b0032b](https://github.com/ayunis-core/ayunis-core/commit/9b0032b0f0f67eafa42ea168d4d040145b7e11b5))
* streamline chart data transformation and remove unused chart types from localization files. ([f9d4825](https://github.com/ayunis-core/ayunis-core/commit/f9d4825edb85c5f489783d34fb4c74f694fe8da3))
* **ui:** use ayunis registry for shadcn components. TASK: LOC-11061 ([#55](https://github.com/ayunis-core/ayunis-core/issues/55)) ([50008c3](https://github.com/ayunis-core/ayunis-core/commit/50008c3c42e6cf0586489deadd9b8c72be946447))


### Documentation

* Add mcp integration docs ([3309e92](https://github.com/ayunis-core/ayunis-core/commit/3309e922ec88005f40c9e43a9e5c4a2ffc02790a))
* Add tickets for mcp integration ([3c6a3d4](https://github.com/ayunis-core/ayunis-core/commit/3c6a3d48ff03d49c26abe829b38dea5c763d26ea))
* add tickets PR7-009 and PR7-010 for application-level test failures ([8084ed1](https://github.com/ayunis-core/ayunis-core/commit/8084ed12a0923f54d63578cf11685a49d62eea50))
* update tickets to reflect resolution of PR7-009 and PR7-010 ([2f86fae](https://github.com/ayunis-core/ayunis-core/commit/2f86faea1b8bc521a1ef31d5f238d3fcc0a49628))


### Miscellaneous

* add Husky for Git hooks and update project configuration. TASK: AYC-36 ([07206b2](https://github.com/ayunis-core/ayunis-core/commit/07206b24f92a0d7a8846688071e7bb81c678eed1))
* update mistral sdk ([53c5f01](https://github.com/ayunis-core/ayunis-core/commit/53c5f01d2a1d4c3375a427fbcfc2ea996ebd926b))
* update packages ([7cfccd3](https://github.com/ayunis-core/ayunis-core/commit/7cfccd38bf76ff7b1a7f31051432aea0d46b707a))
* update pg ([8275ad4](https://github.com/ayunis-core/ayunis-core/commit/8275ad4affe621a02fa2a840d112c000e3c4a5ea))


### CI/CD

* add release please and auto deploy ([#69](https://github.com/ayunis-core/ayunis-core/issues/69)) ([422412a](https://github.com/ayunis-core/ayunis-core/commit/422412a5456ec38cd93fcea038a3660d678a017a))
* add slack notification after prod deploy AYC-000 ([#72](https://github.com/ayunis-core/ayunis-core/issues/72)) ([861992d](https://github.com/ayunis-core/ayunis-core/commit/861992d17cd290fb900d3afd398fd2d730e4269e))

## Changelog
