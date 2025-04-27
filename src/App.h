#pragma once

#include <wx/wx.h>

class App : public wxApp {
public:
    virtual bool OnInit() override;
    virtual int OnExit() override;

private:
    void* originalDisplayMode = nullptr; // Store CGDisplayModeRef as void*
}; 