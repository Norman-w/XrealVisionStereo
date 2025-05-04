/*
眼镜的信息定义,业务模型
根据当前发现,一个眼镜中有4个HID设备(在系统上并行存在)
只有其中一个设备(接口)是可以通讯的,其他的有向上位机上报陀螺仪等信息的以及其他的不知道具体用途的接口.
* */
#ifndef DEVICE_INFO_H
#define DEVICE_INFO_H
#include <cstdint>
#include <string>

#include "INTERFACE_INFO.h"


class GLASSES_INFO {
public:
    //眼镜的VID (Vendor ID,也就是生产商ID)
    uint16_t vendorId;
    //眼镜的PID(Product ID,也就是产品ID)
    uint16_t productId;
    //眼镜的序列号
    std::string serialNumber;
    //眼镜的生产商文本
    std::string manufacturer;
    //眼镜的产品文本
    std::string product;
    //真正用于通讯的接口的路径
    // std::string communicate_interface_path;
    //真正用于通讯的接口
    mutable INTERFACE_INFO *communicate_interface;

    //眼镜的所有接口列表
    std::vector<INTERFACE_INFO> interfaces;
    
    // 构造函数，初始化指针为nullptr
    GLASSES_INFO() : vendorId(0), productId(0), communicate_interface(nullptr) {
    }

    // 析构函数，确保释放接口指针
    ~GLASSES_INFO() {
        if (communicate_interface) {
            delete communicate_interface;
            communicate_interface = nullptr;
        }
    }
};


#endif //DEVICE_INFO_H
