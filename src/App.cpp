#include "App.h"
#include "MainFrame.h"
#include "ScreenResolution.h"
#include <wx/stdpaths.h>
#include <wx/filename.h>
#include <wx/msgdlg.h>
#include <wx/utils.h> // 添加这个头文件用于wxExecute和wxMilliSleep
#include <cstdio> // Include for fprintf, stderr
#include <unistd.h> // 添加这个头文件用于getpid

#include "XRealGlassesController/Index.h"

// macOS特定头文件
#ifdef __WXOSX__
#include <ApplicationServices/ApplicationServices.h>
#endif

// 定义事件表
BEGIN_EVENT_TABLE(App, wxApp)
    EVT_TIMER(wxID_ANY, App::OnResolutionCheckTimer)
END_EVENT_TABLE()

bool App::OnInit() {
    if (!wxApp::OnInit())
        return false;
        
    // 尝试连接到眼镜
    auto xrealGlassesController = new Index();
    if (!xrealGlassesController->connectGlasses()) {
        wxLogError("连接到眼镜失败");
        return false;
    }
    
    // 保存当前显示模式（之后可能需要恢复）
    originalDisplayMode = ScreenResolution::saveCurrentDisplayMode();
    if (!originalDisplayMode) {
        wxLogError("Failed to save the original display mode.");
    }
    
    // 设置眼镜的分辨率(发送命令)
    if (!xrealGlassesController->switchMode(true)) {
        wxLogError("设置眼镜分辨率失败");
        return false;
    }
    
    // 启动定时器，延迟检查分辨率是否正确
    fprintf(stderr, "将在5秒后检查分辨率...\n");
    m_resolutionCheckTimer.SetOwner(this);
    m_resolutionCheckTimer.Start(1000); // 每秒检查一次，最多检查5次
    
    return true;
}

void App::OnResolutionCheckTimer(wxTimerEvent& event) {
    m_resolutionCheckCount++;
    
    // 获取当前屏幕分辨率
    wxSize screenSize = wxGetDisplaySize();
    fprintf(stderr, "第%d次检查分辨率: %dx%d\n", 
            m_resolutionCheckCount, screenSize.GetWidth(), screenSize.GetHeight());
    
    // 如果达到预期分辨率（宽度等于或接近3840），创建主窗口
    if (screenSize.GetWidth() >= 3800) {
        fprintf(stderr, "检测到预期分辨率，创建主窗口...\n");
        m_resolutionCheckTimer.Stop();
        CreateMainWindow();
        return;
    }
    
    // 达到最大检查次数（5次），仍然没有正确的分辨率，恢复并退出
    if (m_resolutionCheckCount >= 5) {
        fprintf(stderr, "分辨率检查超时，恢复2D模式并退出...\n");
        m_resolutionCheckTimer.Stop();
        RestoreAndExit();
    }
}

bool App::CreateMainWindow() {
    // 获取当前屏幕分辨率
    wxSize screenSize = wxGetDisplaySize();
    fprintf(stderr, "当前屏幕分辨率: %dx%d\n", screenSize.GetWidth(), screenSize.GetHeight());
    
    // 3D模式下，窗口应该填满整个屏幕
    auto formPos = wxPoint(0, 0);
    auto formSize = screenSize;
    
    // 创建主窗口
    MainFrame *frame = new MainFrame("Xreal Vision Stereo Viewer", formPos, formSize);
    SetTopWindow(frame);
    
    // 显示窗口
    frame->Show(true);
    
    // 确保全屏显示
    frame->ShowFullScreen(true, wxFULLSCREEN_ALL);
    
    // 强制前台显示
    frame->Raise();
    frame->SetFocus();
    
    // 在macOS上特别处理前台问题
#ifdef __WXOSX__
    // 使用API切换到前台
    ProcessSerialNumber psn = { 0, kCurrentProcess };
    TransformProcessType(&psn, kProcessTransformToForegroundApplication);
    SetFrontProcess(&psn);
#endif

    // 准备加载HTML文件
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

void App::RestoreAndExit() {
    // 恢复2D模式
    fprintf(stderr, "恢复2D模式...\n");
    Index::restoreTo2DMode();
    
    // 恢复原始分辨率
    if (originalDisplayMode) {
        fprintf(stderr, "恢复原始分辨率...\n");
        ScreenResolution::restoreDisplayMode(originalDisplayMode);
        originalDisplayMode = nullptr;
    }
    
    // 退出应用
    fprintf(stderr, "退出应用...\n");
    ExitMainLoop();
}

int App::OnExit() {
    // 首先将眼镜切换回2D模式
    try {
        fprintf(stderr, "正在尝试将眼镜切换回2D模式...\n");
        Index::restoreTo2DMode(); // 切换回2D模式并断开连接
    } catch (const std::exception& e) {
        fwprintf(stderr, L"切换眼镜模式时发生错误: %s\n", e.what());
    }
    
    // 恢复原始显示模式
    if (originalDisplayMode) {
        fprintf(stderr, "正在尝试恢复原始显示模式...\n");

        CGError restoreError = ScreenResolution::restoreDisplayMode(originalDisplayMode);
        if (restoreError != ::kCGErrorSuccess) {
            fwprintf(stderr, L"错误：无法恢复原始显示模式 (错误代码: %d)。显示分辨率可能保持不变。\n", restoreError);
        }
        originalDisplayMode = nullptr;
    }
    return wxApp::OnExit();
}
