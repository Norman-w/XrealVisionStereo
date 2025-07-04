// src/MainFrame.cpp
#include "MainFrame.h"
#include <wx/sizer.h>
#include <wx/menu.h> // Include for menu
#include <wx/accel.h> // 添加加速器表支持
#include <cstdio> // Include for fprintf/stderr/stdout
#include <wx/process.h> // For wxProcess
#include <wx/utils.h>   // For wxExecute

// --- Add required headers for FS Handler ---
#include <wx/webviewfshandler.h> // For wxWebViewFSHandler (Corrected class name here too)
#include <wx/fs_mem.h>     // For wxMemoryInputStream and wxMemoryFSHandler::OpenFile
#include <wx/stdpaths.h>   // For wxStandardPaths
#include <wx/filename.h>   // For wxFileName
#include <wx/log.h>        // For wxLogWarning/wxLogError
#include <wx/mimetype.h> // For wxMimeTypesManager::GetFileTypeFromExtension
#include <wx/arrstr.h>   // For wxArrayString, wxSplit
#include <wx/wfstream.h>   // Add for wxFileInputStream
#include <wx/sharedptr.h> // Add for wxSharedPtr
// --- End Add Headers ---

enum {
    ID_LoadTimer = wxID_HIGHEST + 1,
    ID_ReloadDevServerTimer // Add new timer ID
    // No need for custom menu IDs if using stock IDs like wxID_EXIT
};

// --- Define AppBundleFSHandler --- 
// Custom handler to load files from the app bundle's Resources directory
class AppBundleFSHandler : public wxWebViewFSHandler
{
private:
    wxString m_scheme; // Store the scheme name locally

public:
    // Constructor takes the protocol scheme (e.g., "wxfs")
    AppBundleFSHandler(const wxString& scheme)
        : wxWebViewFSHandler(scheme), m_scheme(scheme) {} // Initialize base and member

    // This method is called by wxWebView when it encounters our scheme
    virtual wxFSFile* GetFile(const wxString& uri) override
    {
        fprintf(stderr, "[HANDLER DEBUG] AppBundleFSHandler::GetFile called for URI: %s\n", (const char*)uri.ToUTF8());

        // 1. Extract the relative path from the URI using the stored scheme
        wxString relativePath = uri.Mid(m_scheme.length() + 3); // Use m_scheme
        fprintf(stderr, "[HANDLER DEBUG]   Extracted relative path: %s\n", (const char*)relativePath.ToUTF8());
        if (relativePath.IsEmpty() || relativePath.Contains("..")) { 
             fprintf(stderr, "[HANDLER WARNING]   Invalid or disallowed path requested: %s\n", (const char*)uri.ToUTF8());
             return nullptr;
         }

        // 2. Get the application's Resources directory path
        wxString resourceDir = wxStandardPaths::Get().GetResourcesDir();
        fprintf(stderr, "[HANDLER DEBUG]   Resource dir: %s\n", (const char*)resourceDir.ToUTF8());
        if (resourceDir.IsEmpty()) {
            fprintf(stderr, "[HANDLER ERROR]   Could not determine Resources directory path.\n");
            return nullptr;
        }

        // 3. Construct the full path to the requested file within the bundle
        wxFileName filePath(resourceDir, wxEmptyString);
        filePath.AppendDir("html");

        // Append relative path components safely
        wxArrayString pathComponents = wxSplit(relativePath, '/', '\\'); 
        for (const wxString& component : pathComponents) {
            if (component.IsEmpty() || component == ".") continue; 
            // Check if it's the filename
            if (&component == &pathComponents.Last()) {
                 filePath.SetFullName(component);
            } else {
                filePath.AppendDir(component);
            }
        }
        wxString fullPath = filePath.GetFullPath();
        fprintf(stderr, "[HANDLER DEBUG]   Constructed full path: %s\n", (const char*)fullPath.ToUTF8());

        // 4. Check if the file exists
        if (!filePath.FileExists()) { 
            fprintf(stderr, "[HANDLER WARNING]   File NOT found: %s\n", (const char*)fullPath.ToUTF8());
            return nullptr;
        }
        fprintf(stderr, "[HANDLER DEBUG]   File exists: %s\n", (const char*)fullPath.ToUTF8());

        // 5. Open the file and create a wxFSFile
        wxFileInputStream* stream = new wxFileInputStream(fullPath);
        if (!stream || !stream->IsOk()) {
             fprintf(stderr, "[HANDLER ERROR]   Failed to open file stream for: %s\n", (const char*)fullPath.ToUTF8());
             delete stream; 
             return nullptr;
        }
        fprintf(stderr, "[HANDLER DEBUG]   File stream opened successfully.\n");

        // Get MIME type
        wxString mimeType = "application/octet-stream";
        wxString ext = filePath.GetExt();
        if (!ext.IsEmpty()) {
            wxFileType* ft = wxTheMimeTypesManager->GetFileTypeFromExtension(ext);
            if (ft) {
                ft->GetMimeType(&mimeType);
                delete ft;
            }
        }
         if (mimeType == "application/octet-stream") {
             if (ext == "glsl" || ext == "vert" || ext == "frag" || ext == "fs" || ext == "vs") {
                 mimeType = "text/plain";
             }
         }
        fprintf(stderr, "[HANDLER DEBUG]   Determined MIME type: %s\n", (const char*)mimeType.ToUTF8());

        fprintf(stderr, "[HANDLER INFO] Serving file: %s (MIME: %s) for URI: %s\n", (const char*)fullPath.ToUTF8(), (const char*)mimeType.ToUTF8(), (const char*)uri.ToUTF8());

        // Correct the wxFSFile constructor call arguments (again)
        return new wxFSFile(stream,                    // 1. Stream
                            uri,                       // 2. Location (URI)
                            mimeType,                  // 3. MIME Type
                            wxEmptyString,             // 4. Anchor
                            wxDateTime::Now());        // 5. Modification Time (as wxDateTime object)
    }
};
// --- End Define AppBundleFSHandler ---

wxBEGIN_EVENT_TABLE(MainFrame, wxFrame)
    EVT_CLOSE(MainFrame::OnClose)
    EVT_TIMER(ID_LoadTimer, MainFrame::OnTimerLoad)
    EVT_WEBVIEW_NAVIGATED(wxID_ANY, MainFrame::OnWebViewNavigated)
    EVT_WEBVIEW_LOADED(wxID_ANY, MainFrame::OnWebViewLoaded)
    EVT_WEBVIEW_ERROR(wxID_ANY, MainFrame::OnWebViewError)
    EVT_MENU(wxID_EXIT, MainFrame::OnQuit)
    EVT_CHAR_HOOK(MainFrame::OnCharHook)
    EVT_KEY_DOWN(MainFrame::OnKeyDown)
    EVT_KEY_UP(MainFrame::OnKeyUp)
    EVT_SIZE(MainFrame::OnSize)  // 添加大小变化处理
    EVT_TIMER(ID_ReloadDevServerTimer, MainFrame::OnReloadDevServerTimer) // Add event table entry for new timer
wxEND_EVENT_TABLE()

MainFrame::MainFrame(const wxString& title, const wxPoint& pos, const wxSize& size)
    : wxFrame(nullptr, wxID_ANY, title, pos, size, 
              wxFULL_REPAINT_ON_RESIZE | wxNO_BORDER), // 移除wxDEFAULT_FRAME_STYLE，使用更简洁的样式
      m_loadTimer(this, ID_LoadTimer),
      m_devServerAttempted(false), // Initialize m_devServerAttempted
      m_reloadDevServerTimer(this, ID_ReloadDevServerTimer) // Set owner and ID for the new timer
{
    // 设置为真正的无边框窗口
    SetWindowStyle(wxNO_BORDER | wxCLIP_CHILDREN);
    
    // 隐藏工具栏和菜单栏
    #ifdef __WXOSX__
    // 在macOS上隐藏标题栏和工具栏
    SetWindowVariant(wxWINDOW_VARIANT_SMALL);
    SetExtraStyle(GetExtraStyle() | wxFRAME_NO_TASKBAR);
    #endif

    // 设置键盘加速器 - 为Command+Q创建退出快捷键
    wxAcceleratorEntry entries[1];
    entries[0].Set(wxACCEL_CMD, 'Q', wxID_EXIT);
    wxAcceleratorTable accel(1, entries);
    SetAcceleratorTable(accel);
    
    // 创建隐藏菜单以支持加速器
    wxMenu *fileMenu = new wxMenu;
    fileMenu->Append(wxID_EXIT, wxT("退出\tCtrl+Q"));
    
    wxMenuBar *menuBar = new wxMenuBar;
    menuBar->Append(fileMenu, wxT("文件"));
    SetMenuBar(menuBar);
    
    // 在macOS上隐藏菜单栏，但保留其功能
    #ifdef __WXOSX__
    // 不使用不存在的MacAutoMenuBar方法，改为隐藏窗口样式
    SetWindowStyleFlag(GetWindowStyleFlag() | wxSTAY_ON_TOP);
    #endif

    // 记录窗口初始尺寸
    wxSize initSize = size;
    fprintf(stderr, "初始窗口尺寸: %dx%d\n", initSize.GetWidth(), initSize.GetHeight());

    // 创建WebView (不需要菜单)
    #if wxUSE_WEBVIEW
    webView = wxWebView::New(this, wxID_ANY);
    if (webView) {
        // 禁用右键菜单和开发者工具
        webView->EnableContextMenu(false);
        webView->EnableAccessToDevTools(false);

        // 注册自定义文件系统处理器
        webView->RegisterHandler(wxSharedPtr<wxWebViewHandler>(new AppBundleFSHandler("wxfs")));
        
        // 使用伸展性sizer确保WebView填满整个窗口
        wxBoxSizer* sizer = new wxBoxSizer(wxVERTICAL);
        sizer->Add(webView, 1, wxEXPAND | wxALL, 0);  // 比例为1，允许伸展，无边距
        SetSizer(sizer);
        
        // 应用sizer到窗口大小
        SetMinSize(wxSize(640, 480));  // 设置最小尺寸防止过小
        sizer->SetSizeHints(this);  // 确保sizer尺寸提示应用到窗口
        
        // 记录WebView初始尺寸
        fprintf(stderr, "WebView初始尺寸: %dx%d\n", 
                webView->GetSize().GetWidth(), webView->GetSize().GetHeight());
    } else {
        fprintf(stderr, "[错误] 无法创建wxWebView后端\n");
    }
    #else
    fprintf(stderr, "[错误] 此wxWidgets构建未启用wxWebView支持\n");
    #endif
    
    // 调整尺寸以适应屏幕
    wxSize screenSize = wxGetDisplaySize();
    int screenWidth = screenSize.GetWidth();
    int screenHeight = screenSize.GetHeight();
    
    SetSize(0, 0, screenWidth, screenHeight);
    Centre(wxBOTH);  // 确保居中
    
    // 立即应用布局
    Layout();
    
    // 设置完全全屏模式
    ShowFullScreen(true, wxFULLSCREEN_NOBORDER | wxFULLSCREEN_NOCAPTION | wxFULLSCREEN_ALL);
    
    // 记录全屏后的尺寸
    fprintf(stderr, "全屏后窗口客户区尺寸: %dx%d\n", 
            GetClientSize().GetWidth(), GetClientSize().GetHeight());
            
    // 全屏后强制更新WebView尺寸
    if (webView) {
        wxSize clientSize = GetClientSize();
        webView->SetSize(0, 0, clientSize.GetWidth(), clientSize.GetHeight());
    }
    
    Refresh(true);
}

MainFrame::~MainFrame() {
    if (m_loadTimer.IsRunning()) {
        m_loadTimer.Stop();
    }
}

void MainFrame::PrepareLoadUrl(const wxString& url) {
    m_urlToLoad = url;
    if (m_urlToLoad == "http://localhost:5173") {
        m_devServerAttempted = false; // Reset when trying to load the dev server URL
    }
    if (!m_loadTimer.StartOnce(100)) {
        // Corrected fprintf (newline inside quotes)
        fprintf(stderr, "[错误] 无法启动加载计时器。\n");
        #if wxUSE_WEBVIEW
        if (webView) {
             // Fallback to immediate load
             // Corrected fprintf (newline inside quotes)
             fprintf(stderr, "[信息] 计时器启动失败，立即加载 URL: %s\n", (const char*)url.ToUTF8());
             webView->LoadURL(m_urlToLoad);
        }
        #endif
    } else {
        // Corrected fprintf (newline inside quotes)
        fprintf(stderr, "[信息] 已启动计时器以延迟加载 URL。\n");
    }
}

void MainFrame::OnTimerLoad(wxTimerEvent& event) {
    // Corrected fprintf (newline inside quotes)
    fprintf(stderr, "[信息] 计时器触发。正在加载 URL: %s\n", (const char*)m_urlToLoad.ToUTF8());
    #if wxUSE_WEBVIEW
    if (webView && !m_urlToLoad.IsEmpty()) {
        webView->LoadURL(m_urlToLoad);
    } else if (!webView) {
         // Corrected fprintf (newline inside quotes)
         fprintf(stderr, "[错误] 计时器触发时 WebView 为空。\n");
    } else {
         // Corrected fprintf (newline inside quotes)
         fprintf(stderr, "[警告] 计时器触发时要加载的 URL 为空。\n");
    }
    #endif
}

void MainFrame::OnWebViewNavigated(wxWebViewEvent& event) {
    // Corrected fprintf (newline inside quotes)
    fprintf(stderr, "[信息] WebView 导航: URL='%s', Target='%s'\n",
            (const char*)event.GetURL().ToUTF8(),
            (const char*)event.GetTarget().ToUTF8());
}

void MainFrame::OnWebViewLoaded(wxWebViewEvent& event) {
    fprintf(stderr, "[信息] WebView 加载完成: URL='%s', Target='%s'\n",
            (const char*)event.GetURL().ToUTF8(),
            (const char*)event.GetTarget().ToUTF8());
    
    // 设置控件位置（填充整个窗口）
    if (webView) {
        wxSize clientSize = GetClientSize();
        fprintf(stderr, "[信息] 加载完成后设置WebView尺寸: %dx%d\n", 
                clientSize.GetWidth(), clientSize.GetHeight());
        
        // 确保WebView填满整个客户区域
        webView->SetSize(0, 0, clientSize.GetWidth(), clientSize.GetHeight());
        
        // 强制布局刷新
        Layout();
        Refresh();
    }
}

void MainFrame::OnWebViewError(wxWebViewEvent& event) {
    wxString url = event.GetURL();
    wxString targetUrl = "http://localhost:5173";
    fprintf(stderr, "[WebView ERROR] Failed to load URL: %s, Error: %s\n", 
            (const char*)url.ToUTF8(), (const char*)event.GetString().ToUTF8());

    if (url == targetUrl && !m_devServerAttempted) {
        m_devServerAttempted = true;
        fprintf(stderr, "[WebView INFO] Attempting to start dev server and reload...\n");

        // Get the base path of the application
        wxString basePath = wxStandardPaths::Get().GetExecutablePath();
        wxFileName exeFileName(basePath);
        exeFileName.RemoveLastDir(); // up to Contents/MacOS
        exeFileName.RemoveLastDir(); // up to Contents
        exeFileName.RemoveLastDir(); // up to XrealVisionStereo.app
        exeFileName.RemoveLastDir(); // up to the directory containing the .app bundle (project root)
        wxString projectRootPath = exeFileName.GetPath();

        // Construct the command to run npm run dev in the web directory
        // wxString command = wxString::Format("cd %s/web && npm run dev", projectRootPath);
        // Using wxExecute, it's better to set the working directory if possible, or use shell.
        // For simplicity with wxExecute and to ensure environment is sourced:
        wxString command = wxString::Format("sh -c 'cd %s/web && npm run dev'", projectRootPath);

        fprintf(stderr, "[WebView INFO] Executing command: %s\n", (const char*)command.ToUTF8());

        // Execute the command in the background
        long processId = wxExecute(command, wxEXEC_ASYNC | wxEXEC_MAKE_GROUP_LEADER);

        if (processId == 0) {
            fprintf(stderr, "[WebView ERROR] Failed to execute command: %s\n", (const char*)command.ToUTF8());
        } else {
            fprintf(stderr, "[WebView INFO] Dev server process started with PID: %ld. Will attempt to reload in 5 seconds.\n", processId);
            // Start the reload timer
            if (!m_reloadDevServerTimer.StartOnce(5000)) { // 5000 ms = 5 seconds
                fprintf(stderr, "[WebView ERROR] Failed to start the dev server reload timer!\n");
            }
        }
    } else if (url == targetUrl && m_devServerAttempted) {
        fprintf(stderr, "[WebView WARNING] Still failed to load %s after attempting to start dev server. Please check server logs.\n", (const char*)targetUrl.ToUTF8());
    }
}

// --- Add Implementations for Missing Key Handlers ---
void MainFrame::OnCharHook(wxKeyEvent& event) {
    int keyCode = event.GetKeyCode();
    long timestamp = event.GetTimestamp();
    
    fprintf(stderr, "键盘钩子事件: 代码=%d, Command=%d, Control=%d, Alt=%d, Shift=%d\n", 
            keyCode, (int)event.CmdDown(), (int)event.ControlDown(), 
            (int)event.AltDown(), (int)event.ShiftDown());
    
    // 检测Command+Q (macOS退出快捷键)
    if (keyCode == 'Q' && event.CmdDown()) {
        fprintf(stderr, "捕获到Command+Q组合键，正在退出应用...\n");
        wxCommandEvent quitEvent(wxEVT_MENU, wxID_EXIT);
        quitEvent.SetEventObject(this);
        ProcessEvent(quitEvent);
        return;
    }
    
    // 正常处理其他按键事件
    //LogToWebView(wxString::Format("[C++ HOOK] CharHook: Code=%d, Timestamp=%ld", keyCode, timestamp));
    event.Skip(); // Allow event to propagate
}

void MainFrame::OnKeyDown(wxKeyEvent& event) {
    int keyCode = event.GetKeyCode();
    long timestamp = event.GetTimestamp();
    // fprintf(stderr, "[C++ DEBUG MainFrame KEY_DOWN] KeyDown: Code=%d, Timestamp=%ld\n", keyCode, timestamp);
    LogToWebView(wxString::Format("[C++ KEY] KeyDown: Code=%d, Timestamp=%ld", keyCode, timestamp));
    event.Skip(); // Allow event to propagate
}

void MainFrame::OnKeyUp(wxKeyEvent& event) {
    int keyCode = event.GetKeyCode();
    long timestamp = event.GetTimestamp();
    // fprintf(stderr, "[C++ DEBUG MainFrame KEY_UP] KeyUp: Code=%d, Timestamp=%ld\n", keyCode, timestamp);
    LogToWebView(wxString::Format("[C++ KEY] KeyUp: Code=%d, Timestamp=%ld", keyCode, timestamp));
    event.Skip(); // Allow event to propagate
}
// --- End Key Handler Implementations ---

// --- Implementation for OnReloadDevServerTimer ---
void MainFrame::OnReloadDevServerTimer(wxTimerEvent& event) {
    fprintf(stderr, "[WebView INFO] Reload timer triggered. Attempting to load %s\n", "http://localhost:5173");
    if (webView) {
        m_devServerAttempted = false; // Allow another attempt to start server if this fails
        webView->LoadURL("http://localhost:5173");
    } else {
        fprintf(stderr, "[WebView ERROR] Cannot reload dev server URL, webView is null!\n");
    }
}

// --- Add LogToWebView Method --- 
void MainFrame::LogToWebView(const wxString& message) {
    if (!webView) return; // Don't try if webView isn't created

    // Basic JavaScript escaping: replace backslash, single quote, and newline
    wxString escapedMessage = message;
    escapedMessage.Replace("\\", "\\\\"); // Escape backslashes FIRST
    escapedMessage.Replace("'", "\\'"); // Escape single quotes
    escapedMessage.Replace("\n", "\\n"); // Escape newlines
    // Add more escapes if needed (e.g., double quotes)

    wxString script = wxString::Format("if (typeof appendLog === 'function') { appendLog('%s'); } else { console.error('appendLog function not found'); }", escapedMessage);

    // RunScript might need to be called on the main UI thread if logging from other threads
    // For now, assuming calls are from the main thread
    webView->RunScriptAsync(script);
    // Use RunScriptAsync if available and appropriate to avoid blocking
    // webView->RunScript(script); // Or synchronous version
}
// --- End LogToWebView Method ---

// Quit Handler
void MainFrame::OnQuit(wxCommandEvent& event) {
    fprintf(stderr, "退出命令已接收，关闭应用程序...\n");
    LogToWebView("[C++ QUIT] Quit command received.");
    Close(true); // true forces closing the frame
}

void MainFrame::OnClose(wxCloseEvent& event) {
    Destroy();
}

// 添加OnSize函数实现
void MainFrame::OnSize(wxSizeEvent& event) {
    // 获取窗口客户区大小
    wxSize size = GetClientSize();
    fprintf(stderr, "窗口大小变化: %dx%d\n", size.GetWidth(), size.GetHeight());
    
    // 确保WebView填满整个窗口
    if (webView) {
        webView->SetSize(0, 0, size.GetWidth(), size.GetHeight());
    }
    
    // 调用默认处理
    event.Skip();
} 