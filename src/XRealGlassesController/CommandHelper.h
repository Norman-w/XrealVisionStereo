//
// Created by Norman Wang on 2025/5/2.
//

#ifndef COMMANDHELPER_H
#define COMMANDHELPER_H
#include <vector>


class CommandHelper {

public:
    /**
     * 构建自定义显示模式命令
     * 允许完全自定义所有参数以测试不同组合
     *
     * @param msgId - 消息ID (如0x0008)
     * @param mode - 主要模式值 (位置22的值)
     * @param subMode - 子模式/附加参数1 (位置23的值)
     * @param param1 - 分辨率参数1 (位置24的值)
     * @param param2 - 分辨率参数2 (位置25的值)
     * @param refresh - 刷新率参数 (位置26的值)
     * @param length - 命令数据长度 (默认0x18=24)
     * @return - 构造好的命令
     */
    static std::vector<uint8_t> buildCustomDisplayCommand(
        uint16_t msgId = 0x0008,
        uint8_t mode = 3,
        uint8_t subMode = 1,
        uint8_t param1 = 3,
        uint8_t param2 = 0xB4,
        uint8_t refresh = 0,
        uint16_t length = 0x18
    );

    /**
     * 将字符串转换为字节数组
     * @param str - 输入字符串
     * @return - 转换后的字节数组
     */
    static std::vector<uint8_t> strToPayload(const std::string& str);
};



#endif //COMMANDHELPER_H
