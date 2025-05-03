//
// Created by Norman Wang on 2025/5/2.
//

#include "Index.h"

#include "CommandHelper.h"
#include "Utils.h"

INTERFACE_INFO* Index::current_connected_device_interface = nullptr;

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

bool Index::connectGlasses() {
    const std::vector<GLASSES_INFO> allGlassesList = DevicesHelper::enumerateClassesByHid();

    if (allGlassesList.empty()) {
        Utils::log("未找到XREAL眼镜,请确定眼镜是否已有效连接", LogLevel::ERROR);
        return false;
    }

    // 如果电脑上连接了多个XREAL眼镜,则默认使用第一个.
    const GLASSES_INFO& selectedDevice = allGlassesList[0];

    Utils::log("正在连接到设备: " + selectedDevice.serialNumber, LogLevel::INFO);

    // 检查设备是否已连接
    if (selectedDevice.interfaces.empty()) {
        Utils::log("未找到可用的接口", LogLevel::ERROR);
        return false;
    }

    // 更新眼镜的有效通讯接口指针
    auto validateInterface = new INTERFACE_INFO(
        DevicesHelper::getValidHidInterface(selectedDevice.interfaces));
    selectedDevice.communicate_interface = validateInterface;
    Utils::log("找到有效的通讯接口", LogLevel::INFO);
    current_connected_device_interface = selectedDevice.communicate_interface;
    return true;
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
    return DevicesHelper::sendCommand(current_connected_device_interface, command);
}
