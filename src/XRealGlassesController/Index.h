//
// Created by Norman Wang on 2025/5/2.
//

#ifndef INDEX_H
#define INDEX_H
#include <string>

#include "DevicesHelper.h"


class Index {
private:
    static INTERFACE_INFO *current_connected_device_interface;
public:
    Index();
    ~Index();
    /**
         * 连接XReal眼镜
         * @return - 连接是否成功
         */
    static bool connectGlasses();

    /**
     * 断开XReal眼镜连接
     * @return - 断开是否成功
     */
    static bool disconnectGlasses();
    
    /**
     * 恢复到2D模式并断开连接 - 用于应用退出时
     * @return - 操作是否成功
     */
    static bool restoreTo2DMode();

    /**
     * 检查设备是否已连接
     * @return - 设备是否已连接
     */
    bool isConnected() const;
    /**
     * 切换眼镜显示模式
     * @param mode3D - true为3D模式，false为2D模式
     * @return - 切换是否成功
     */
    bool switchMode(bool mode3D) const;
};



#endif //INDEX_H
