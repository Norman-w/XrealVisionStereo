//
// Created by Norman Wang on 2025/5/3.
//

#include "INTERFACE_INFO.h"

#include <thread>

#include "DevicesHelper.h"
#include "Utils.h"
bool INTERFACE_INFO::open() {
    original_hid_device = hid_open_path(hid_path.c_str());
    if (!original_hid_device) {
        Utils::log("打开设备失败: " + hid_path, LogLevel::ERROR);
        return false;
    }
    // 设置非阻塞模式
    if (hid_set_nonblocking(original_hid_device, 1) < 0) {
        Utils::log("设置非阻塞模式失败", LogLevel::ERROR);
        hid_close(original_hid_device);
        return false;
    }
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

    if (original_hid_device) {
        hid_close(original_hid_device);
        original_hid_device = nullptr;
    }

    is_connected = false;
    Utils::log("设备已关闭: " + hid_path, LogLevel::INFO);

    return true;
}

void INTERFACE_INFO::startMessagePolling() {
    std::thread([this]() {
        while (is_connected) {
            uint8_t buffer[256];
            if (const int bytesRead = hid_read(original_hid_device, buffer, sizeof(buffer)); bytesRead > 0) {
                std::vector<uint8_t> message(buffer, buffer + bytesRead);
                received_messages.push_back(message);
                // 处理消息
                // Utils::log("收到消息: " + Utils::bytesToHex(message), LogLevel::INFO);
            }
        }
    }).detach();
}
void INTERFACE_INFO::stopMessagePolling() {
    is_connected = false;
    if (original_hid_device) {
        hid_close(original_hid_device);
        original_hid_device = nullptr;
    }
}
