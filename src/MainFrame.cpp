// src/MainFrame.cpp
#include "MainFrame.h"
#include <wx/sizer.h>
#include <wx/menu.h> // Include for menu
#include <cstdio> // Include for fprintf/stderr/stdout

enum {
    ID_LoadTimer = wxID_HIGHEST + 1
    // No need for custom menu IDs if using stock IDs like wxID_EXIT
};

wxBEGIN_EVENT_TABLE(MainFrame, wxFrame)
    EVT_CLOSE(MainFrame::OnClose)
    EVT_TIMER(ID_LoadTimer, MainFrame::OnTimerLoad)
    EVT_WEBVIEW_NAVIGATED(wxID_ANY, MainFrame::OnWebViewNavigated)
    EVT_WEBVIEW_LOADED(wxID_ANY, MainFrame::OnWebViewLoaded)
    EVT_WEBVIEW_ERROR(wxID_ANY, MainFrame::OnWebViewError)
    EVT_MENU(wxID_EXIT, MainFrame::OnQuit) // Bind Quit menu item
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
        wxBoxSizer* sizer = new wxBoxSizer(wxVERTICAL);
        sizer->Add(webView, 1, wxEXPAND);
        SetSizer(sizer);
        // Layout(); // Layout is handled by ShowFullScreen or later events

        // Enable developer tools
        webView->EnableContextMenu(true);
        webView->EnableAccessToDevTools(true);
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
             fprintf(stdout, "[信息] 计时器启动失败，立即加载 URL: %s\n", (const char*)url.ToUTF8());
             webView->LoadURL(m_urlToLoad);
        }
        #endif
    } else {
        // Corrected fprintf (newline inside quotes)
        fprintf(stdout, "[信息] 已启动计时器以延迟加载 URL。\n");
    }
}

void MainFrame::OnTimerLoad(wxTimerEvent& event) {
    // Corrected fprintf (newline inside quotes)
    fprintf(stdout, "[信息] 计时器触发。正在加载 URL: %s\n", (const char*)m_urlToLoad.ToUTF8());
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
    fprintf(stdout, "[信息] WebView 导航: URL='%s', Target='%s'\n",
            (const char*)event.GetURL().ToUTF8(),
            (const char*)event.GetTarget().ToUTF8());
}

void MainFrame::OnWebViewLoaded(wxWebViewEvent& event) {
    // Corrected fprintf (newline inside quotes)
    fprintf(stdout, "[信息] WebView 加载完成: URL='%s', Target='%s'\n",
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

// Quit Handler
void MainFrame::OnQuit(wxCommandEvent& event) {
    Close(true); // true forces closing the frame
}

void MainFrame::OnClose(wxCloseEvent& event) {
    Destroy();
} 