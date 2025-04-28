#pragma once

#include <wx/wx.h>
#include <wx/webview.h>
#include <wx/timer.h>

class MainFrame : public wxFrame {
public:
    MainFrame(const wxString& title, const wxPoint& pos, const wxSize& size);
    virtual ~MainFrame();

    void PrepareLoadUrl(const wxString& url);

private:
    wxWebView* webView = nullptr;
    wxTimer m_loadTimer;
    wxString m_urlToLoad;

    void OnClose(wxCloseEvent& event);
    void OnTimerLoad(wxTimerEvent& event);
    void OnWebViewNavigated(wxWebViewEvent& event);
    void OnWebViewLoaded(wxWebViewEvent& event);
    void OnWebViewError(wxWebViewEvent& event);
    void OnQuit(wxCommandEvent& event);

    void OnCharHook(wxKeyEvent& event);
    void OnKeyDown(wxKeyEvent& event);
    void OnKeyUp(wxKeyEvent& event);

    void LogToWebView(const wxString& message);

    wxDECLARE_EVENT_TABLE();
}; 