//
// Created by Norman Wang on 2025/5/2.
//

#include "Index.h"

#include "CommandHelper.h"
#include "Utils.h"


Index::Index() {
    // if (!isConnected()) {
    //     log("设备未连接", LogLevel::INFO);
    //     return true;
    // }
    //
    // try {
    //     // 关闭设备
    //     device->close();
    //     deviceOpened = false;
    //     log("设备已断开连接", LogLevel::SUCCESS);
    //     return true;
    // } catch (const std::exception& e) {
    //     log(std::string("断开设备异常: ") + e.what(), LogLevel::ERROR);
    //     return false;
    // }
}

Index::~Index() {
    if (current_connected_device_interface) {
        // Attempt to disconnect the connected device cleanly
        disconnectGlasses();
    }
}

bool Index::connectGlasses(const std::string &devicePath) {
    std::vector<GLASSES_INFO> allDevices = DevicesHelper::enumerateHidDevices(false);

    // 通过XREAL的VID, PID来过滤出来设备
    std::vector<GLASSES_INFO> allXrealDevices;

    for (const auto &device: allDevices) {
        if (device.vendorId == DevicesHelper::XREAL_VID && device.productId == DevicesHelper::XREAL_PID) {
            allXrealDevices.push_back(device);
        }
    }

    if (allXrealDevices.empty()) {
        Utils::log("No XREAL devices found.", LogLevel::ERROR);
        return false;
    }

    // 如果电脑上连接了多个XREAL眼镜,则默认使用第一个.
    GLASSES_INFO selectedDevice = allXrealDevices[0];

    Utils::log("Attempting to connect to device: " + selectedDevice.hid_path, LogLevel::INFO);
    //
    // DevicesHelper devicesHelper;
    // if (devicesHelper.openDevice(selectedDevice.hid_path)) {
    //     current_connected_device = devicesHelper.device; // Store the device handle
    //     Utils::log("Successfully connected to " + selectedDevice.hid_path, LogLevel::SUCCESS);
    //     return true;
    // }

    Utils::log("Failed to connect to device at path: " + selectedDevice.hid_path, LogLevel::ERROR);
    return false;
}

bool Index::disconnectGlasses() {
    if (!current_connected_device_interface) {
        Utils::log("No device is currently connected.", LogLevel::WARNING);
        return false;
    }

    try {
        // Close the HID device connection
        hid_close(current_connected_device_interface->original_hid_device);
        current_connected_device_interface = nullptr;

        Utils::log("Successfully disconnected the device.", LogLevel::SUCCESS);
        return true;
    } catch (const std::exception &e) {
        Utils::log(std::string("Error during device disconnection: ") + e.what(), LogLevel::ERROR);
        return false;
    }
}

bool Index::isConnected() const {
    return current_connected_device_interface != nullptr;
}


/**
 * 切换眼镜显示模式
 * @param mode3D - true为3D模式，false为2D模式
 * @return - 切换是否成功
 */
bool Index::switchMode(const bool mode3D) const {
    // 构建显示模式命令
    const uint8_t mode = mode3D ? 3 : 1;  // 假设3是3D模式，1是2D模式
    auto command = CommandHelper::buildCustomDisplayCommand(0x0008, mode);
    
    // 发送命令
    Utils::log(std::string("切换到") + (mode3D ? "3D" : "2D") + "模式", LogLevel::INFO);
    return current_connected_device_interface != nullptr && DevicesHelper::sendCommand(current_connected_device_interface, command);
}
