#!/bin/bash

# 西安交通大学会议室预约系统 - 快速部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

echo "======================================"
echo "  西安交大会议室预约系统 - 部署脚本"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "检测到操作系统: $OS"

# 检查 Python
check_python() {
    echo -e "${YELLOW}[1/5] 检查 Python 环境...${NC}"

    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        echo -e "${GREEN}✓ 已安装 $PYTHON_VERSION${NC}"
    else
        echo -e "${RED}✗ 未找到 Python3，请先安装 Python 3.8+${NC}"
        echo "  Ubuntu/Debian: sudo apt install python3 python3-pip"
        echo "  macOS: brew install python3"
        exit 1
    fi
}

# 检查 pip
check_pip() {
    echo -e "${YELLOW}[2/5] 检查 pip...${NC}"

    if command -v pip3 &> /dev/null; then
        echo -e "${GREEN}✓ pip 已安装${NC}"
    else
        echo -e "${YELLOW}! pip 未安装，尝试安装...${NC}"
        if [[ "$OS" == "linux" ]]; then
            sudo apt install python3-pip -y || sudo yum install python3-pip -y
        elif [[ "$OS" == "macos" ]]; then
            python3 -m ensurepip
        fi
    fi
}

# 安装后端依赖
install_backend() {
    echo -e "${YELLOW}[3/5] 安装后端依赖...${NC}"

    cd backend

    # 创建虚拟环境（可选）
    if [[ "$1" == "--venv" ]]; then
        echo "创建虚拟环境..."
        python3 -m venv venv
        source venv/bin/activate
    fi

    # 安装依赖
    pip3 install -r requirements.txt -q

    echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
    cd ..
}

# 安装小程序依赖
install_miniprogram() {
    echo -e "${YELLOW}[4/5] 安装小程序依赖...${NC}"

    # 检查 npm
    if command -v npm &> /dev/null; then
        cd miniprogram
        npm install --production
        echo -e "${GREEN}✓ 小程序依赖安装完成${NC}"
        cd ..
    else
        echo -e "${YELLOW}! 未找到 npm，跳过小程序依赖安装${NC}"
        echo "  请手动安装 Node.js: https://nodejs.org/"
        echo "  然后在 miniprogram 目录运行: npm install"
    fi
}

# 启动后端服务
start_backend() {
    echo -e "${YELLOW}[5/5] 启动后端服务...${NC}"

    cd backend
    python3 main.py &
    BACKEND_PID=$!
    cd ..

    # 等待服务启动
    sleep 3

    # 检查服务是否运行
    if curl -s http://localhost:8000/api/campus > /dev/null; then
        echo -e "${GREEN}✓ 后端服务启动成功${NC}"
        echo ""
        echo "======================================"
        echo "  服务已启动"
        echo "======================================"
        echo ""
        echo "  后端 API:     http://localhost:8000"
        echo "  API 文档:     http://localhost:8000/docs"
        echo "  管理后台:     http://localhost:8000/admin"
        echo ""
        echo "  后端进程 PID: $BACKEND_PID"
        echo "  停止服务:     kill $BACKEND_PID"
        echo ""
    else
        echo -e "${RED}✗ 后端服务启动失败${NC}"
        exit 1
    fi
}

# 主流程
main() {
    check_python
    check_pip
    install_backend $1
    install_miniprogram

    echo ""
    read -p "是否启动后端服务? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_backend
    else
        echo ""
        echo "手动启动命令:"
        echo "  cd backend && python3 main.py"
    fi

    echo ""
    echo -e "${GREEN}部署完成!${NC}"
    echo ""
    echo "下一步:"
    echo "  1. 用微信开发者工具打开 miniprogram 目录"
    echo "  2. 修改 miniprogram/app.js 中的 apiBase 为服务器地址"
    echo "  3. 修改 miniprogram/project.config.json 中的 appid"
    echo "  4. 在微信开发者工具中「构建 npm」"
}

main "$@"