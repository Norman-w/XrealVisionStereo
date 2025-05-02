#!/bin/bash

# 定义颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 显示带颜色的信息
echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 定义构建目录
BUILD_DIR="cursor-build-debug"
APP_NAME="XrealVisionStereo.app"

# 检查当前目录是否是项目根目录
if [ ! -f "CMakeLists.txt" ]; then
    echo_error "请在项目根目录下运行此脚本"
    exit 1
fi

# 检查并终止已经运行的XrealVisionStereo进程
echo_info "检查是否有运行中的XrealVisionStereo进程..."
APP_PID=$(pgrep -f "XrealVisionStereo")
if [ ! -z "$APP_PID" ]; then
    echo_warn "发现运行中的XrealVisionStereo进程 (PID: $APP_PID)，正在终止..."
    kill -9 $APP_PID
    if [ $? -eq 0 ]; then
        echo_info "进程已终止"
    else
        echo_error "无法终止进程，请手动关闭应用后再试"
        exit 1
    fi
    # 等待进程完全结束
    sleep 1
fi

# 清理旧的构建目录
echo_info "清理构建目录: ${BUILD_DIR}"
rm -rf ${BUILD_DIR}
if [ $? -ne 0 ]; then
    echo_error "清理构建目录失败"
    exit 1
fi

# 创建新的构建目录
echo_info "创建构建目录: ${BUILD_DIR}"
mkdir -p ${BUILD_DIR}
if [ $? -ne 0 ]; then
    echo_error "创建构建目录失败"
    exit 1
fi

# 进入构建目录
cd ${BUILD_DIR}
if [ $? -ne 0 ]; then
    echo_error "无法进入构建目录"
    exit 1
fi

# 运行CMake
echo_info "配置项目 (cmake ..)"
cmake ..
if [ $? -ne 0 ]; then
    echo_error "配置项目失败"
    exit 1
fi

# 编译项目
echo_info "编译项目 (make)"
make
if [ $? -ne 0 ]; then
    echo_error "编译项目失败"
    exit 1
fi

# 检查应用程序是否存在
if [ ! -d "${APP_NAME}" ]; then
    echo_error "构建过程未能生成应用程序: ${APP_NAME}"
    exit 1
fi

# 启动应用程序
echo_info "启动应用程序: ${APP_NAME}"
open ${APP_NAME}
if [ $? -ne 0 ]; then
    echo_error "启动应用程序失败"
    exit 1
fi

echo_info "完成！应用程序已启动"
exit 0 