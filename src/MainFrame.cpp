// src/MainFrame.cpp
#include "MainFrame.h"
#include <wx/sizer.h>
#include <wx/menu.h> // Include for menu
#include <cstdio> // Include for fprintf/stderr/stdout

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
    ID_LoadTimer = wxID_HIGHEST + 1
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
wxEND_EVENT_TABLE()

MainFrame::MainFrame(const wxString& title, const wxPoint& pos, const wxSize& size)
    : wxFrame(nullptr, wxID_ANY, title, pos, size, wxDEFAULT_FRAME_STYLE | wxNO_BORDER /* Optional: No border for cleaner fullscreen */),
      m_loadTimer(this, ID_LoadTimer)
{
    // --- Menu Bar Setup ---
    wxMenu *menuFile = new wxMenu;
    // Note: wxWidgets automatically maps standard IDs like wxID_EXIT
    // to the platform's standard text and shortcut (Cmd+Q on macOS)
    menuFile->Append(wxID_EXIT);

    wxMenuBar *menuBar = new wxMenuBar;
    menuBar->Append(menuFile, "&File");

    SetMenuBar(menuBar);
    // --- End Menu Bar Setup ---

    // Create WebView
    #if wxUSE_WEBVIEW
    webView = wxWebView::New(this, wxID_ANY);
    if (webView) {
        // Enable developer tools
        webView->EnableContextMenu(true);
        webView->EnableAccessToDevTools(true);

        // --- Register the custom file system handler FIRST --- 
        // Needs to be registered before LoadURL if the initial URL uses it,
        // or before any script tries to fetch using the scheme.
        webView->RegisterHandler(wxSharedPtr<wxWebViewHandler>(new AppBundleFSHandler("wxfs")));
        LogToWebView(wxT("[REGISTER INFO] wxfs file system handler registered."));

        wxBoxSizer* sizer = new wxBoxSizer(wxVERTICAL);
        sizer->Add(webView, 1, wxEXPAND);
        SetSizer(sizer);
        // Layout(); // Layout is handled by ShowFullScreen or later events

    } else {
        // Corrected fprintf (newline inside quotes)
        fprintf(stderr, "[错误] 无法创建 wxWebView 后端。\n");
    }
    #else
    // Corrected fprintf (newline inside quotes)
    fprintf(stderr, "[错误] 此 wxWidgets 构建未启用 wxWebView 支持。\n");
    #endif

    // Maximize(); // Replaced by ShowFullScreen
    ShowFullScreen(true, wxFULLSCREEN_ALL);
    Layout(); // Ensure layout after fullscreen
}

MainFrame::~MainFrame() {
    if (m_loadTimer.IsRunning()) {
        m_loadTimer.Stop();
    }
}

void MainFrame::PrepareLoadUrl(const wxString& url) {
    m_urlToLoad = url;
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
    // Corrected fprintf (newline inside quotes)
    fprintf(stderr, "[信息] WebView 加载完成: URL='%s', Target='%s'\n",
            (const char*)event.GetURL().ToUTF8(),
            (const char*)event.GetTarget().ToUTF8());
}

void MainFrame::OnWebViewError(wxWebViewEvent& event) {
    // Corrected fwprintf (newline inside quotes)
    fwprintf(stderr, L"[错误] WebView 错误: URL='%ls', Target='%ls', Code=%d, Description='%ls'\n",
               (const wchar_t*)event.GetURL().wc_str(),
               (const wchar_t*)event.GetTarget().wc_str(),
               event.GetInt(),
               (const wchar_t*)event.GetString().wc_str());
}

// --- Add Implementations for Missing Key Handlers ---
void MainFrame::OnCharHook(wxKeyEvent& event) {
    int keyCode = event.GetKeyCode();
    long timestamp = event.GetTimestamp();
    // fprintf(stderr, "[C++ DEBUG MainFrame CHAR_HOOK] CharHook: Code=%d, Timestamp=%ld\n", keyCode, timestamp);
    LogToWebView(wxString::Format("[C++ HOOK] CharHook: Code=%d, Timestamp=%ld", keyCode, timestamp));
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
    LogToWebView("[C++ QUIT] Quit command received.");
    Close(true); // true forces closing the frame
}

void MainFrame::OnClose(wxCloseEvent& event) {
    Destroy();
} 