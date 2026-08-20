/**
 * 앱 아이콘을 `AppIcon` 에셋으로 되돌리는 플러그인.
 *
 * SDK 57 의 bare 템플릿은 Icon Composer 번들 `ios/<앱>/expo.icon` — 파란 그라디언트에
 * Expo 심볼이 얹힌 그 아이콘 — 을 같이 깔고, Xcode 빌드 설정
 * `ASSETCATALOG_COMPILER_APPICON_NAME` 을 `expo` 로 박아둔다. 그런데 prebuild 의 아이콘
 * 단계는 `ios.icon` 이 `.icon` 번들일 때만 이 설정을 건드린다 — 우리처럼 PNG 를 주면
 * `AppIcon.appiconset` 에 1024 짜리를 써 넣기만 하고 설정은 `expo` 그대로 둔다. 그래서
 * **아이콘을 제대로 지정해도 홈 화면에는 Expo 로고가 뜬다.** 에셋은 만들어졌는데 아무도
 * 안 보는 것이라, 설정 어디를 봐도 틀린 곳이 없어 보이는 게 이 증상의 고약한 점이다.
 *
 * `ios/` 는 gitignore 되고 prebuild 가 통째로 다시 만드는 곳이므로, 손으로 고치면 다음
 * 빌드에 사라진다. 그래서 설정으로 남긴다.
 */
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/** 빌드 설정을 `AppIcon` 으로. prebuild 가 만들어 둔 appiconset 이 이제 실제로 쓰인다. */
function useAppIconAsset(config) {
  return withXcodeProject(config, (config) => {
    const sections = config.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(sections)) {
      const settings = sections[key]?.buildSettings;
      if (settings?.ASSETCATALOG_COMPILER_APPICON_NAME) {
        settings.ASSETCATALOG_COMPILER_APPICON_NAME = 'AppIcon';
      }
    }
    return config;
  });
}

/**
 * 템플릿이 깔아둔 `expo.icon` 번들과 그 참조를 지운다. 남겨두면 빌드는 되지만 쓰이지 않는
 * 리소스가 번들에 실린다. 참조를 먼저 지우지 않고 디렉터리만 지우면 Xcode 가 입력 파일을
 * 못 찾아 빌드가 깨지므로, 둘은 항상 같이 간다.
 */
function dropTemplateIcon(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const { platformProjectRoot, projectName } = config.modRequest;
      const bundle = path.join(platformProjectRoot, projectName, 'expo.icon');
      const pbxproj = path.join(platformProjectRoot, `${projectName}.xcodeproj`, 'project.pbxproj');

      fs.rmSync(bundle, { recursive: true, force: true });
      if (fs.existsSync(pbxproj)) {
        const kept = fs
          .readFileSync(pbxproj, 'utf8')
          .split('\n')
          .filter((line) => !line.includes('expo.icon'));
        fs.writeFileSync(pbxproj, kept.join('\n'));
      }
      return config;
    },
  ]);
}

module.exports = (config) => dropTemplateIcon(useAppIconAsset(config));
