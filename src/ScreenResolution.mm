#import <CoreGraphics/CoreGraphics.h>
#import <AppKit/AppKit.h> // Needed for NSScreen, although we use CoreGraphics primarily
#include "ScreenResolution.h"
#include <iostream> // For error logging

namespace ScreenResolution {

    CGDisplayModeRef currentMode = nullptr; // Store the mode to switch to
    CGDisplayModeRef originalMode = nullptr; // Store the original mode

    // Helper to find the best mode for given dimensions
    CGDisplayModeRef findBestMode(CGDirectDisplayID displayID, size_t width, size_t height) {
        CFArrayRef modes = CGDisplayCopyAllDisplayModes(displayID, NULL);
        if (!modes) {
            std::cerr << "Error: Could not get display modes." << std::endl;
            return nullptr;
        }

        CGDisplayModeRef bestMode = nullptr;
        CFIndex count = CFArrayGetCount(modes);
        for (CFIndex i = 0; i < count; ++i) {
            CGDisplayModeRef mode = (CGDisplayModeRef)CFArrayGetValueAtIndex(modes, i);
            if (CGDisplayModeGetWidth(mode) == width && CGDisplayModeGetHeight(mode) == height) {
                // Check if this mode is usable for the display
                if (CGDisplayModeIsUsableForDesktopGUI(mode)) {
                     // Prefer non-interlaced, higher refresh rate? For now, just take the first match.
                     // TODO: Add logic to select the best mode if multiple matches exist (e.g., highest refresh rate)
                    bestMode = mode;
                    CGDisplayModeRetain(bestMode); // Retain the mode we selected
                    break;
                }
            }
        }

        CFRelease(modes);
        return bestMode;
    }

    void* saveCurrentDisplayMode() {
        CGDirectDisplayID mainDisplay = CGMainDisplayID();
        originalMode = CGDisplayCopyDisplayMode(mainDisplay);
        if (!originalMode) {
            std::cerr << "Error: Could not copy current display mode." << std::endl;
        }
        // The caller owns this reference now.
        return (void*)originalMode;
    }

    CGError setDisplayMode(size_t width, size_t height) {
        CGDirectDisplayID mainDisplay = CGMainDisplayID();
        CGError err = ::kCGErrorSuccess; // Use scope resolution operator for clarity

        // Find the desired mode
        CGDisplayModeRef desiredMode = findBestMode(mainDisplay, width, height);
        if (!desiredMode) {
            std::cerr << "Error: Could not find a suitable display mode for " << width << "x" << height << "." << std::endl;
            return ::kCGErrorFailure; // Use enum constant
        }

        // Capture the display before changing the mode
        err = CGCaptureAllDisplays();
        if (err != ::kCGErrorSuccess) {
            std::cerr << "Error: Could not capture displays. Error code: " << err << std::endl;
             std::cerr << "This might be due to missing Screen Recording permissions." << std::endl;
            CGDisplayModeRelease(desiredMode);
            return err;
        }

        // Switch to the new mode
        err = CGDisplaySetDisplayMode(mainDisplay, desiredMode, NULL);
        if (err != ::kCGErrorSuccess) {
            std::cerr << "Error: Could not set display mode. Error code: " << err << std::endl;
            CGReleaseAllDisplays(); // Attempt to release capture
            CGDisplayModeRelease(desiredMode);
            return err;
        }

        CGDisplayModeRelease(desiredMode);
        return ::kCGErrorSuccess;
    }

    CGError restoreDisplayMode(void* modeRef) {
        if (!modeRef) {
            std::cerr << "Warning: restoreDisplayMode called with null modeRef." << std::endl;
            // Cannot restore without a mode, but attempt release just in case capture leaked
            // CGReleaseAllDisplays(); // Avoid releasing if we are unsure capture succeeded
            return ::kCGErrorIllegalArgument;
        }

        CGDisplayModeRef modeToRestore = (CGDisplayModeRef)modeRef;
        CGDirectDisplayID mainDisplay = CGMainDisplayID();
        CGError finalError = ::kCGErrorSuccess;

        // Assume capture was attempted if modeRef is valid.
        // Directly attempt restore and release.

        CGError restoreErr = CGDisplaySetDisplayMode(mainDisplay, modeToRestore, NULL);
        if (restoreErr != ::kCGErrorSuccess) {
            std::cerr << "Error: Could not restore original display mode. Error code: " << restoreErr << std::endl;
            finalError = restoreErr;
        }

        // Always attempt to release display capture after trying to set the mode.
        // This should be done regardless of whether the restore succeeded, or
        // even if we weren't sure capture happened (it's safe to release if not captured).
        CGError releaseErr = CGReleaseAllDisplays();
        if (releaseErr != ::kCGErrorSuccess) {
            std::cerr << "Error: Could not release display capture. Error code: " << releaseErr << std::endl;
            if (finalError == ::kCGErrorSuccess) finalError = releaseErr;
        }

        CGDisplayModeRelease(modeToRestore);
        return finalError;
    }

    // Implementation to open system settings
    void openPrivacyScreenRecordingSettings() {
        #if defined(__APPLE__)
        // Use NSWorkspace to open the Privacy & Security pane, focusing on Screen Recording if possible
        // Note: The exact URL scheme might change between macOS versions.
        // Trying a more specific URL first:
        NSURL *specificUrl = [NSURL URLWithString:@"x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"];
        BOOL openedSpecific = [[NSWorkspace sharedWorkspace] openURL:specificUrl];

        if (!openedSpecific) {
             // Fallback to the general Privacy & Security pane
             NSURL *generalUrl = [NSURL URLWithString:@"x-apple.systempreferences:com.apple.preference.security?Privacy"];
             BOOL openedGeneral = [[NSWorkspace sharedWorkspace] openURL:generalUrl];
              if (!openedGeneral) {
                   // Fallback to opening the System Settings app itself
                   NSURL *appUrl = [NSURL URLWithString:@"/System/Applications/System Settings.app"];
                   [[NSWorkspace sharedWorkspace] openURL:appUrl];
              }
        }
        #else
        std::cerr << "Opening system settings is only supported on macOS." << std::endl;
        #endif
    }

} 