/*
 * Spider Privacy Browser — RN bridge for native Safari content blocking (iOS).
 *
 * Thin RCTBridgeModule that forwards the WKContentRuleList JSON and the on/off
 * toggle from JS (src/native/iosContentBlocker.ts) to SpiderContentRuleStore,
 * which is implemented inside the react-native-webview pod (see
 * apple/SpiderContentRuleStore.m, added via patch-package).
 *
 * We call the store through a LOCAL forward declaration instead of importing its
 * pod header: the class symbol is resolved at link time (one implementation, in
 * the pod), so this keeps the dependency direction app -> library and avoids any
 * CocoaPods header-search-path coupling.
 *
 * NOTE (manual step): this file must be added to the SpiderPrivacyBrowser Xcode
 * target — the RN template lists sources explicitly in project.pbxproj rather
 * than by folder reference. Being Objective-C, it needs no bridging header.
 */
#import <React/RCTBridgeModule.h>

@interface SpiderContentRuleStore : NSObject
+ (void)setRulesJSON:(NSString *)json;
+ (void)setEnabled:(BOOL)enabled;
@end

@interface SpiderContentBlocker : NSObject <RCTBridgeModule>
@end

@implementation SpiderContentBlocker

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(setRules:(NSString *)json) {
  [SpiderContentRuleStore setRulesJSON:json];
}

RCT_EXPORT_METHOD(setEnabled:(BOOL)enabled) {
  [SpiderContentRuleStore setEnabled:enabled];
}

@end
