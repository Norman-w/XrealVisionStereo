#pragma once

#include <wx/wx.h>
#include <wx/timer.h>

class App : public wxApp {
public:
    virtual bool OnInit() override;
    virtual int OnExit() override;

private:
    void* originalDisplayMode = nullptr; // Store CGDisplayModeRef as void*
    
    // 添加分辨率检查相关成员
    wxTimer m_resolutionCheckTimer;
    int m_resolutionCheckCount = 0;
    
    // 处理分辨率检查定时器事件
    void OnResolutionCheckTimer(wxTimerEvent& event);
    
    // 创建主窗口
    bool CreateMainWindow();
    
    // 若分辨率检查失败则恢复2D并退出
    void RestoreAndExit();
    
    DECLARE_EVENT_TABLE()
}; 