#include "App.h"
#include "MainFrame.h"
#include "ScreenResolution.h"
#include <wx/stdpaths.h>
#include <wx/filename.h>
#include <wx/msgdlg.h>
#include <cstdio> // Include for fprintf, stderr

bool App::OnInit() {
    if (!wxApp::OnInit())
        return false;

    // 1. Save current display mode (Keep this, restore on exit is good practice)
    originalDisplayMode = ScreenResolution::saveCurrentDisplayMode();
    if (!originalDisplayMode) {
        wxLogError("Failed to save the original display mode.");
    }

    // 2. Set desired display mode (REMOVED - Handled by external device/settings)
    /*
    size_t targetWidth = 3840;
    size_t targetHeight = 1080;
    CGError setModeError = ScreenResolution::setDisplayMode(targetWidth, targetHeight);

    if (setModeError != ::kCGErrorSuccess) {
        wxString errorMsg = wxString::Format("Failed to set display mode to %zux%zu (Error code: %d).\n", targetWidth, targetHeight, setModeError);
        wxString detailedMsg = errorMsg;

        // Convert wxString messages to C-style strings for fprintf/fwprintf
        // Note: Using fwprintf with L prefix for wide characters (better for potential Unicode/Chinese)

        // Check if the error might be related to permissions
        if (setModeError == ::kCGErrorCannotComplete || setModeError == ::kCGErrorFailure) {
             // detailedMsg += "\nThis application needs 'Screen Recording' permission... ";
             // Print detailed message to stderr
             fwprintf(stderr, L"错误：无法设置显示模式 %zux%zu (错误代码: %d)。\n", targetWidth, targetHeight, setModeError);
             fwprintf(stderr, L"原因：应用可能需要"屏幕录制"权限来更改显示设置。请在"系统设置"->"隐私与安全性"->"屏幕录制"中授予权限，或确保硬件支持此分辨率。
");
             // Ask user to open settings via console? Less intuitive.
             // fprintf(stderr, "需要打开系统设置吗? (需要手动操作)\n");

             // int response = wxMessageBox(detailedMsg, "Permission Required", wxOK | wxCANCEL | wxICON_WARNING | wxCENTRE);
             // if (response == wxOK) {
             //       ScreenResolution::openPrivacyScreenRecordingSettings();
             // }
        } else {
             // For other errors, just print basic message to stderr
             // wxMessageBox(errorMsg, "Display Mode Error", wxOK | wxICON_ERROR | wxCENTRE);
             fwprintf(stderr, L"错误：无法设置显示模式 %zux%zu (错误代码: %d)。\n", targetWidth, targetHeight, setModeError);
        }
        // wxLogError(errorMsg); // Replaced by fprintf/fwprintf

        if (originalDisplayMode && setModeError != ::kCGErrorSuccess) {
             CGError restoreError = ScreenResolution::restoreDisplayMode(originalDisplayMode);
             if (restoreError != ::kCGErrorSuccess) {
                 // wxLogError("Attempted immediate restore...", restoreError);
                 fwprintf(stderr, L"尝试立即恢复原始模式失败 (错误代码: %d)。\n", restoreError);
             }
             originalDisplayMode = nullptr;
        }
    }
    */

    // 3. Create the main application window
    MainFrame *frame = new MainFrame("Xreal Vision Stereo Viewer", wxDefaultPosition, wxDefaultSize);
    // Use DefaultSize for fullscreen
    frame->Show(true);

    // 4. Prepare to Load the HTML file
    wxString resourceDir = wxStandardPaths::Get().GetResourcesDir();
    if (resourceDir.IsEmpty()) {
        wxLogError("Could not get resources directory path.");
        return false;
    }
    wxString fullPathStr = resourceDir;
    fullPathStr.Append(wxFileName::GetPathSeparator());
    fullPathStr.Append("html");
    fullPathStr.Append(wxFileName::GetPathSeparator());
    fullPathStr.Append("stereo_view.html");
    wxFileName htmlPath(fullPathStr);
    if (!htmlPath.IsOk()) {
        wxLogError("Constructed htmlPath from full string is invalid: %s", fullPathStr);
        return false;
    }
    if (!htmlPath.FileExists()) {
        wxLogWarning("HTML file does not exist at: %s", htmlPath.GetFullPath());
    }
    wxString url = wxString("file://") + htmlPath.GetFullPath();
    frame->PrepareLoadUrl(url);

    return true;
}

int App::OnExit() {
    if (originalDisplayMode) {
        // Use fprintf for direct console output in Chinese
        // Corrected fprintf call
        fprintf(stderr, "正在尝试恢复原始显示模式...\n"); // Newline inside quotes

        CGError restoreError = ScreenResolution::restoreDisplayMode(originalDisplayMode);
        if (restoreError != ::kCGErrorSuccess) {
            // Print error to stderr in Chinese
            // Corrected fwprintf call
            fwprintf(stderr, L"错误：无法恢复原始显示模式 (错误代码: %d)。显示分辨率可能保持不变。\n", restoreError); // Newline inside quotes
        }
        originalDisplayMode = nullptr;
    }
    return wxApp::OnExit();
}
