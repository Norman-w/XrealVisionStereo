//
// Created by Norman Wang on 2025/5/3.
//

#include "INTERFACE_INFO.h"

#include <thread>
#include <locale>
#include <codecvt>

#include "DevicesHelper.h"
#include "Utils.h"

// 声明wcharToString函数，它在DevicesHelper.cpp中定义
extern std::string wcharToString(const wchar_t *wstr);

// 构造函数实现
INTERFACE_INFO::INTERFACE_INFO() : 
    interface_number(0), 
    is_connected(false),
    deviceResource(nullptr) {
}

// 拷贝构造函数实现
INTERFACE_INFO::INTERFACE_INFO(const INTERFACE_INFO& other) :
    interface_number(other.interface_number),
    is_connected(other.is_connected),
    hid_path(other.hid_path),
    deviceResource(other.deviceResource), // 共享设备资源，引用计数会自动增加
    received_messages(other.received_messages) {
    // 注意：std::shared_ptr自动处理引用计数
}

// 赋值运算符实现
INTERFACE_INFO& INTERFACE_INFO::operator=(const INTERFACE_INFO& other) {
    if (this != &other) {
        interface_number = other.interface_number;
        is_connected = other.is_connected;
        hid_path = other.hid_path;
        deviceResource = other.deviceResource; // shared_ptr会自动处理引用计数
        received_messages = other.received_messages;
    }
    return *this;
}

// 析构函数实现
INTERFACE_INFO::~INTERFACE_INFO() {
    // 确保设备被关闭
    close();
    // shared_ptr会自动处理引用计数和资源释放
}

void INTERFACE_INFO::setOriginalHidDevice(hid_device* device) {
    if (device) {
        deviceResource = std::make_shared<DeviceResource>(device);
    } else {
        deviceResource.reset();
    }
}

bool INTERFACE_INFO::open() {
    hid_device* device = hid_open_path(hid_path.c_str());
    if (!device) {
        Utils::log("打开设备失败: " + hid_path, LogLevel::ERROR);
        return false;
    }
    
    // 设置非阻塞模式
    if (hid_set_nonblocking(device, 1) < 0) {
        Utils::log("设置非阻塞模式失败", LogLevel::ERROR);
        hid_close(device);
        return false;
    }
    
    // 设置设备资源
    setOriginalHidDevice(device);
    
    // 开始消息轮询
    is_connected = true;
    startMessagePolling();
    Utils::log("设备已打开: " + hid_path, LogLevel::SUCCESS);
    return true;
}

bool INTERFACE_INFO::close() {
    if (is_connected) {
        stopMessagePolling();
    }

    is_connected = false;
    
    // 释放设备资源，让shared_ptr负责处理引用计数
    deviceResource.reset();
    
    Utils::log("设备已关闭: " + hid_path, LogLevel::INFO);
    return true;
}

void INTERFACE_INFO::startMessagePolling() {
    std::thread([this]() {
        while (is_connected && deviceResource && deviceResource->device) {
            uint8_t buffer[256] = {0}; // 初始化缓冲区为0
            const int bytesRead = hid_read(deviceResource->device, buffer, sizeof(buffer));
            
            if (bytesRead > 0) {
                std::vector<uint8_t> message(buffer, buffer + bytesRead);
                
                // 接收缓冲区限制大小，避免内存无限增长
                if (received_messages.size() > 100) {
                    received_messages.erase(received_messages.begin());
                }
                
                received_messages.push_back(message);
                
                // 处理消息
                // Utils::log("收到消息: " + Utils::bytesToHex(message), LogLevel::INFO);

                //如果收到0xFD开头的消息,则日志输出
                if (!message.empty() && message[0] == 0xFD) {
                    std::string hexData = "收到数据: ";
                    for (size_t i = 0; i < std::min(message.size(), static_cast<size_t>(32)); i++) {
                        char hexBuf[8];
                        snprintf(hexBuf, sizeof(hexBuf), "%02X ", message[i]);
                        hexData += hexBuf;
                    }
                    Utils::log(hexData, LogLevel::INFO);
                }
            } else if (bytesRead < 0) {
                // 读取错误处理
                const wchar_t* err = hid_error(deviceResource->device);
                Utils::log("读取设备数据失败: " + (err ? wcharToString(err) : "未知错误"), LogLevel::ERROR);
                
                // 如果连续出现错误，可以考虑短暂暂停避免频繁日志
                std::this_thread::sleep_for(std::chrono::milliseconds(50));
            }
            
            // 添加短暂延时，避免CPU占用过高
            std::this_thread::sleep_for(std::chrono::milliseconds(5));
        }
    }).detach();
}

void INTERFACE_INFO::stopMessagePolling() {
    // 先设置连接标志为false，这样消息轮询线程会自行退出
    is_connected = false;
    
    // 给轮询线程一点时间退出
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
    
    // 不在这里关闭设备，避免与close方法冲突
    // 让close方法负责关闭设备
}
