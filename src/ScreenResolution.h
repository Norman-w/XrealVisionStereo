// src/ScreenResolution.h
#pragma once

#include <cstddef> // For size_t

#ifdef __APPLE__
#include <CoreGraphics/CGError.h> // Include the actual CGError definition
#else
// Define a placeholder if not on Apple platforms
#define kCGErrorSuccess 0
typedef int CGError;
#endif

namespace ScreenResolution {

    // Returns a pointer to the original display mode (CGDisplayModeRef).
    // Returns nullptr on failure.
    // The caller is responsible for releasing the mode via restoreDisplayMode eventually.
    void* saveCurrentDisplayMode();

    // Sets the display mode for the main display.
    CGError setDisplayMode(size_t width, size_t height);

    // Restores the given display mode (obtained from saveCurrentDisplayMode).
    // Releases the display capture.
    CGError restoreDisplayMode(void* modeRef);

    // Helper to open system settings
    void openPrivacyScreenRecordingSettings();

} 