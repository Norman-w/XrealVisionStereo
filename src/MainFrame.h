#pragma once

#include <wx/wx.h>
#include <wx/webview.h>
#include <wx/timer.h>

class MainFrame : public wxFrame {
public:
    MainFrame(const wxString& title, const wxPoint& pos, const wxSize& size);
    ~MainFrame();

    void PrepareLoadUrl(const wxString& url);

private:
    wxWebView* webView;
    wxTimer m_loadTimer;
    wxString m_urlToLoad;

    void OnClose(wxCloseEvent& event);
    void OnTimerLoad(wxTimerEvent& event);
    void OnWebViewNavigated(wxWebViewEvent& event);
    void OnWebViewLoaded(wxWebViewEvent& event);
    void OnWebViewError(wxWebViewEvent& event);
    void OnQuit(wxCommandEvent& event);

    wxDECLARE_EVENT_TABLE();
}; 