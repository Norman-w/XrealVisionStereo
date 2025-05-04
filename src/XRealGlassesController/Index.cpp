//
// Created by Norman Wang on 2025/5/2.
//

#include "Index.h"

#include "CommandHelper.h"
#include "Utils.h"

INTERFACE_INFO* Index::current_connected_device_interface = nullptr;

Index::Index() = default;

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

    // 获取有效通讯接口（这个接口已经是打开状态）
    INTERFACE_INFO validInterface = DevicesHelper::getValidHidInterface(selectedDevice.interfaces);
    
    // 确保找到了有效接口
    if (!validInterface.is_connected || !validInterface.original_hid_device()) {
        Utils::log("无法获取有效的通讯接口", LogLevel::ERROR);
        return false;
    }
    
    // 创建新的INTERFACE_INFO实例并设置为当前通讯接口
    // 注意：不要关闭validInterface，因为我们要继续使用它
    if (current_connected_device_interface) {
        // 如果之前有连接，先断开
        disconnectGlasses();
    }
    
    current_connected_device_interface = new INTERFACE_INFO(validInterface);
    Utils::log("设备连接成功", LogLevel::SUCCESS);
    return true;
}

bool Index::disconnectGlasses() {
    if (!current_connected_device_interface) {
        Utils::log("No device is currently connected.", LogLevel::WARNING);
        return false;
    }

    try {
        // 先关闭连接
        current_connected_device_interface->close();
        
        // 释放指针
        delete current_connected_device_interface;
        current_connected_device_interface = nullptr;

        Utils::log("Successfully disconnected the device.", LogLevel::SUCCESS);
        return true;
    } catch (const std::exception &e) {
        Utils::log(std::string("Error during device disconnection: ") + e.what(), LogLevel::ERROR);
        return false;
    }
}

bool Index::isConnected() {
    return current_connected_device_interface != nullptr;
}


/**
 * 切换眼镜显示模式
 * @param mode3D - true为3D模式，false为2D模式
 * @return - 切换是否成功
 */
bool Index::switchMode(const bool mode3D) {
    if (!current_connected_device_interface) {
        Utils::log("设备未连接，请先连接设备", LogLevel::ERROR);
        return false;
    }

    // 构建显示模式命令
    const uint8_t mode = mode3D ? 3 : 1;  // 假设3是3D模式，1是2D模式
    auto command = CommandHelper::buildCustomDisplayCommand(0x0008, mode);
    
    // 发送命令
    Utils::log(std::string("切换到") + (mode3D ? "3D" : "2D") + "模式", LogLevel::INFO);
    
    // 使用同步发送，确保命令成功发送并获取结果
    bool result = DevicesHelper::sendCommand(current_connected_device_interface, command);
    
    if (result) {
        Utils::log("切换模式命令发送成功", LogLevel::SUCCESS);
    } else {
        Utils::log("切换模式命令发送失败", LogLevel::ERROR);
    }
    
    return result;
}

/**
 * 恢复到2D模式并断开连接
 * @return - 操作是否成功
 */
bool Index::restoreTo2DMode() {
    bool success = true;
    
    // 检查是否有连接的设备
    if (current_connected_device_interface) {
        // 创建临时索引对象用于调用实例方法
        Index tempIndex;
        
        // 尝试切换回2D模式
        if (!Index::switchMode(false)) {
            Utils::log("无法将眼镜切换回2D模式", LogLevel::ERROR);
            success = false;
        } else {
            Utils::log("已将眼镜成功切换回2D模式", LogLevel::SUCCESS);
        }
        
        // 无论2D模式设置是否成功，都尝试断开连接
        if (!disconnectGlasses()) {
            Utils::log("无法正常断开眼镜连接", LogLevel::ERROR);
            success = false;
        } else {
            Utils::log("已断开眼镜连接", LogLevel::SUCCESS);
        }
    } else {
        Utils::log("没有连接的眼镜设备，无需还原", LogLevel::INFO);
    }
    
    return success;
}
