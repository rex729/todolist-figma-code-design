import 'dart:io';

import 'toolchain_checker.dart';

class _FakeProbe implements EnvironmentProbe {
  _FakeProbe({
    this.androidStudioVersion = '2025.3.4',
    this.androidStudioMaxAgp = '9.2.1',
    this.projectAgpVersion = '9.2.1',
    this.hasAndroidAgpConfig = true,
  });

  final String? androidStudioVersion;
  final String? androidStudioMaxAgp;
  final String? projectAgpVersion;
  final bool hasAndroidAgpConfig;

  @override
  Future<String?> getMacOsVersion() async => '27.2.1';
  @override
  Future<String?> getXcodeVersion() async => '26.6';
  @override
  Future<String?> getSwiftVersion() async => '6.3.3';
  @override
  Future<String?> getCocoaPodsVersion() async => '1.16.2';
  @override
  Future<JavaVersionInfo?> getJavaVersion() async => const JavaVersionInfo(major: 17, raw: '17.0.19');
  @override
  Future<bool> hasAndroidWrapperFiles() async => true;
  @override
  Future<String?> getGradleWrapperVersion() async => '9.8.2';
  @override
  Future<String?> getAndroidSdkPath() async => '/mock/sdk';
  @override
  Future<List<int>> getInstalledAndroidPlatforms(String sdkPath) async => [37];
  @override
  Future<List<String>> getInstalledNdks(String sdkPath) async => ['28.2.13676358'];
  @override
  Future<String?> getAndroidStudioVersion() async => androidStudioVersion;
  @override
  Future<String?> getAndroidStudioMaxSupportedAgpVersion() async => androidStudioMaxAgp;
  @override
  Future<bool> hasProjectAgpConfig() async => hasAndroidAgpConfig;
  @override
  Future<String?> getProjectAgpVersion() async => projectAgpVersion;
}

ToolchainSpec _baseSpec() => ToolchainSpec.fromJson({
      'toolchain': {
        'macos': {'minVersion': '26.0'},
        'xcode': {'minVersion': '26.0'},
        'swift': {'minVersion': '6.0'},
        'cocoapods': {'minVersion': '1.16.0'},
        'java': {'minVersion': 17},
        'gradle': {'minVersion': '9.0.0'},
        'androidGradlePlugin': {'minVersion': '9.0.0', 'recommendedVersion': '9.2.1'},
        'androidStudio': {'minVersion': '2025.3', 'recommendedVersion': '2025.3.4'},
        'kotlin': {'minVersion': '2.0.0'},
        'androidSdk': {'minCompileSdk': 34},
        'androidNdk': {'requiredVersion': '28.2.13676358'},
      }
    });

void _expect(bool condition, String message) {
  if (!condition) {
    stderr.writeln('ASSERTION FAILED: $message');
    exit(1);
  }
}

Future<void> main() async {
  // 1. 合法狀態：Android Studio 2025.3.4 + AGP 9.2.1 通過
  {
    final checker = ToolchainChecker(
      spec: _baseSpec(),
      probe: _FakeProbe(androidStudioVersion: '2025.3.4', androidStudioMaxAgp: '9.2.1', projectAgpVersion: '9.2.1'),
      platform: TargetPlatform.android,
    );
    final report = await checker.checkAll();
    _expect(report.passed, 'Expected valid Android Studio 2025.3.4 and AGP 9.2.1 to pass');
  }

  // 2. 專案 AGP (9.4.1) 高於本機 Android Studio 上限 (9.2.1) 應失敗
  {
    final checker = ToolchainChecker(
      spec: _baseSpec(),
      probe: _FakeProbe(androidStudioVersion: '2025.3.4', androidStudioMaxAgp: '9.2.1', projectAgpVersion: '9.4.1'),
      platform: TargetPlatform.android,
    );
    final report = await checker.checkAll();
    _expect(!report.passed, 'Expected AGP 9.4.1 > IDE max 9.2.1 to fail');
    _expect(
      report.failures.any((f) => f.label == 'AGP (Android)' && (f.remediation?.contains('9.2.1') ?? false)),
      'Expected AGP failure remediation to mention 9.2.1',
    );
  }

  // 3. 專案 AGP (8.13.0) 低於 toolchain.json 最低要求 (9.0.0) 應失敗
  {
    final checker = ToolchainChecker(
      spec: _baseSpec(),
      probe: _FakeProbe(androidStudioVersion: '2025.3.4', androidStudioMaxAgp: '9.2.1', projectAgpVersion: '8.13.0'),
      platform: TargetPlatform.android,
    );
    final report = await checker.checkAll();
    _expect(!report.passed, 'Expected AGP 8.13.0 < min 9.0.0 to fail');
  }

  // 4. Android Studio 未安裝應失敗
  {
    final checker = ToolchainChecker(
      spec: _baseSpec(),
      probe: _FakeProbe(androidStudioVersion: null, androidStudioMaxAgp: null, projectAgpVersion: '9.2.1'),
      platform: TargetPlatform.android,
    );
    final report = await checker.checkAll();
    _expect(!report.passed, 'Expected missing Android Studio to fail');
    _expect(report.failures.any((f) => f.label == 'Android Studio'), 'Expected Android Studio failure label');
  }

  // 5. Android Studio 版本過低 (2024.3.1 < 2025.3) 應失敗
  {
    final checker = ToolchainChecker(
      spec: _baseSpec(),
      probe: _FakeProbe(androidStudioVersion: '2024.3.1', androidStudioMaxAgp: '8.9.0', projectAgpVersion: '8.9.0'),
      platform: TargetPlatform.android,
    );
    final report = await checker.checkAll();
    _expect(!report.passed, 'Expected outdated Android Studio to fail');
  }

  // 6. 尚未建立 Android 專案時 AGP 應略過且通過
  {
    final checker = ToolchainChecker(
      spec: _baseSpec(),
      probe: _FakeProbe(hasAndroidAgpConfig: false, projectAgpVersion: null),
      platform: TargetPlatform.android,
    );
    final report = await checker.checkAll();
    _expect(report.passed, 'Expected uninitialized Android project AGP check to pass');
  }

  stdout.writeln('✅ All 6 toolchain_checker_test cases passed!');
}
