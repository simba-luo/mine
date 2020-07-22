

/**
 * 游戏结束，无论成功或失败。
 */
const MINE_GAME_OVER   = Symbol('game over');
/**
 * 其他逻辑错误，违反规定操作
 *
 * 比如：
 * 1. 游戏已经开始，仍然尝试设置地雷
 */
const MINE_LOGIC_ERROR = Symbol('logic error');

/**
 * 游戏状态
 */
const MINEST_PENDING = Symbol('status pending');
const MINEST_START   = Symbol('status game start');
const MINEST_OVER    = Symbol('status game over');

const COLOR_WINDOW_BG = 'hsl(0, 0%, 100%, .5)';



// 因为游戏的实例只能运行一份
// （只有一份屏幕，只有一份 STATUS，WIDGET 窗口）
// 所以 MineSweeper 类只会创建一次，相当于单例模式
// 所以类属性可以直接拿出来作为全局变量。

/**
 * 当前存在的地雷数
 */
let gMineCount = 0;
/**
 * 当前已用的红旗数
 */
let gFlagsCount = 0;
/**
 * 有效的红旗数
 */
let gFlagsCountYes = 0;
/**
 * 剩余未清除砖块数量
 */
let gUncleanBricks = 0;
let gGameStatus = MINEST_PENDING;

let GROUND = new MineBattleground(1, 1);



/**
 * whether game is over
 */
function isGameOver () {
    return gGameStatus === MINEST_OVER;
}

/**
 * 更新 UI 界面
 */
function Refresh () {

    window.requestAnimationFrame(function () {
        SCREEN.update();
    });
}


const HOT = new class {
    x = 0;
    y = 0;
    type = null;

    clear () {
        this.type = null;
    }

    setPosition (x, y) {
        if (!GROUND.isValid(x, y)) return;

        this.x = x;
        this.y = y;

        const block = GROUND.getBlock(x, y);

        if (block.isFlag) {
            // do nothing
        } else if (block.isBrick) {
            // do nothing
        } else if (block.num > 0) {
            this.type = 'NUM';
        }
    }
};


STATUS.render = function (painter) {
    // 剩余可用红旗数
    const flagsLeft = gMineCount - gFlagsCount;

    painter.setBrush(COLOR_WINDOW_BG);
    painter.fillRect(-2, -2, STATUS.width + 4, STATUS.height + 4);

    painter.setFont('compact', 20, true);
    painter.setBrush('black');
    // Template String
    painter.drawText(10, 30, `${flagsLeft}`);
};



/**
 * usage:
 *
 * let map = new MineSweeper(width, height);
 * map.resetMines(num);
 * map.ready();
 *
 * use `isGameOver()' to check whether game is over
 */
class MineSweeper {


    /**
     * 鼠标左键按下时，记录坐标和类型
     */
    // ArrowFunction
    // bind(this) to current 'this' symbol
    _slot_mousedown = (x, y) => {

        if (isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        HOT.setPosition(x, y);
        Refresh();
    };

    /**
     * 鼠标释放时，清除热点
     */
    _slot_mouseup = (x, y) => {

        if (isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        HOT.clear();
        Refresh();
    };

    /**
     * 右键放置红旗
     */
    _slot_contextmenu = (x, y) => {
        if (isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        try {
            this.toggleFlag(x, y);
        } catch (e) {
            this.GameException(e);
        }
    };

    _slot_click2 = (x, y) => {
        this._click(x, y);
    };

    /**
     * 翻开砖块
     */
    _click (x, y) {
        if (isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        try {
            const block = GROUND.getBlock(x, y);

            if (block.isFlag)
            {
                // do nothing, 红旗不可操作
            }
            else if (block.isBrick)
            {
                // 打开砖块
                this.clearBrick(x, y);
            }
            else if (block.num > 0)
            {
                this.clearNearby(x, y);
            }
            else
            {
                // 剩下的都是空地，不能点击
            }
        } catch (e) {
            this.GameException(e);
        }
    }

    /**
     * 绘制游戏主界面
     */
    _render_main = (painter) => {

        // 底图
        painter.setBrush(COLOR_WINDOW_BG);
        painter.fillRect(-2, -2, WIDGET.width + 4, WIDGET.height + 4);
        painter.drawImage(0, 0, GROUND.IMAGE);

        for (let y = 0; y < GROUND.rows; y ++) {
            for (let x = 0; x < GROUND.cols; x ++) {

                const block = GROUND.getBlock(x, y);

                if (block.isBrick)
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, RES.BRICK);

                if (block.isFlag)
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, RES.FLAG);
            }
        }

        if (HOT.type === 'NUM') {

            const surrounds = GROUND.surroundPositions(HOT.x, HOT.y);

            for (const [x, y] of surrounds) {

                const sr = GROUND.getBlock(x, y);

                if (!sr.isFlag && sr.isBrick)
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, RES.BRICK_REVERSE);
            }
        }
    };

    /**
     * 绘制游戏主界面(游戏结束时)
     */
    _render_main_gg = (painter) => {

        // 底图
        painter.setBrush(COLOR_WINDOW_BG);
        painter.fillRect(-2, -2, WIDGET.width + 4, WIDGET.height + 4);
        painter.drawImage(0, 0, GROUND.IMAGE);

        for (let y = 0; y < GROUND.rows; y ++) {
            for (let x = 0; x < GROUND.cols; x ++) {

                const block = GROUND.getBlock(x, y);

                // 判断红旗是否正确
                if (block.isFlag) {
                    if (block.isBrick) 
                        painter.drawImage(BOX_SIZE * x, BOX_SIZE *y, RES.BRICK);

                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y,
                            block.isMine ? RES.FLAG_HIT : RES.FLAG_MISS);
                }
                // 只有砖块
                else if (block.isBrick) {
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y,
                            block.isMine ? RES.BRICK_GLASS : RES.BRICK);
                }
            }
        }
    };


    constructor (wid, hgt) {
        GROUND = new MineBattleground(wid, hgt);

        WIDGET.onclick       = this._slot_click2;
        WIDGET.oncontextmenu = this._slot_contextmenu;
        WIDGET.onmousedown   = this._slot_mousedown;
        WIDGET.onmouseup     = this._slot_mouseup;
    }

    /**
     * 清理周围的砖块
     *
     * RULE: 只能对数值区域操作
     *
     * RULE: 只有周围红旗数和当前数值对应才会进行
     */
    clearNearby (x, y) {

        const block = GROUND.getBlock(x, y);

        if (block.isFlag || block.isBrick || block.num <= 0)
            return;

        const nearby = GROUND.surroundPositions(x, y);

        // 建立 nearby 与 list 的映射关系
        const list = nearby.map(
            ([x, y]) => {
                return (
                    GROUND.getBlock(x, y).isFlag
                    ) ? 1 : 0
            }
        );

        // 周围的红旗总数
        const n = list.reduce(
            (p,c) => p + c
        );

        // 红旗数和当前数值不一致
        if (block.num === n)
        {
            nearby.forEach(
                ([x, y]) => this.clearBrick(x, y)
            );

            // XXX 这里不需要检查
            this.checkSuccess();
        }
    }

    /**
     * 随机放置地雷
     *
     * RULE: 游戏必须重置为等待状态
     *
     * <delete>
     * 假设地图尺寸为 100x100 = 10000,
     * 则放置 max 个地雷需要循环的次数为：
     *  sum(10000/(10000-i)), i in [0, max)
     *
     * 假设放置 9999 个地雷，需要循环执行约为 88K 次。
     * (仍然很快，用户不太容易感觉到卡顿)
     * </delete>
     *
     * throw symbol
     */
    // 不再使用 Uint8Array(w, h), ArrayBuffer 作为数据存储
    resetMines (max) {

        gGameStatus = MINEST_PENDING;

        if (max > GROUND.size)
            throw MINE_LOGIC_ERROR;

        GROUND.placeMines(max);
        GROUND.ready();


        // ECMA 23.2 Set Object
        //const dict = new Set;
        // dict.has();
        // dict.add();

        gMineCount = max;
        gFlagsCount = 0;
        gFlagsCountYes = 0;
        gUncleanBricks = GROUND.size;
        gGameStatus = MINEST_START;
    }

    // init ground ui
    ready () {

        const painter = new Painter(GROUND.IMAGE);

        for (let j = 0; j < GROUND.rows; j ++) {
            for (let i = 0; i < GROUND.cols; i ++) {

                const block = GROUND.getBlock(i, j);

                // draw ground.
                painter.drawImage(i * BOX_SIZE, j * BOX_SIZE, RES.GROUND);

                if (block.isMine) {
                    // 显示地雷
                    painter.drawImage(i * BOX_SIZE, j * BOX_SIZE, RES.MINE);
                } else if (block.num > 0) {
                    // 显示数值
                    painter.drawImage(i * BOX_SIZE, j * BOX_SIZE, RES.NUMS( block.num ));
                }
            }
        }

        STATUS.move(15, 15);
        STATUS.resize(GROUND.width, 40);
        BTN_START.move(STATUS.width/2-15, 5);

        WIDGET.move(15, 15 + 50);
        WIDGET.resize(GROUND.width, GROUND.height);
        WIDGET.render = this._render_main;
    }

    /**
     * 清除砖块
     *
     * 如果标记为红旗，则什么也不做
     * 如果已经被打开，则什么也不做
     *
     * 如果覆盖着砖块，就打开砖块
     *   如果遇到地雷，游戏结束
     *   如果是空地，则翻开周围砖块
     *
     * return boolean, throw symbol
     */
    clearBrick (x, y) {

        if (!GROUND.isValid(x, y))
            return;

        const block = GROUND.getBlock(x, y);

        if (block.isFlag)
            return;

        if (!block.isBrick)
            return;

        block.clearBrick();
        gUncleanBricks --;
        Refresh();

        // see what's under the brick
        // isMine? then you are dead
        if (block.isMine)
        {
            const p = new Painter(GROUND.IMAGE);
            p.drawImage(BOX_SIZE * x, BOX_SIZE * y, RES.BOOM);
            gGameStatus = MINEST_OVER;
            throw MINE_GAME_OVER;
        }
        else if (block.num === 0) // isEmpty?
        {
            const fn2 = () => {
                this.clearBrick(x-1, y-1);
                this.clearBrick(x+1, y-1);
                this.clearBrick(x+1, y+1);
                this.clearBrick(x-1, y+1);
            };

            const fn = () => {
                this.clearBrick(x-1, y  );
                this.clearBrick(x,   y-1);
                this.clearBrick(x+1, y  );
                this.clearBrick(x,   y+1);

                window.requestAnimationFrame(fn2);
            };

            window.requestAnimationFrame(fn);
        }

        // XXX 这里不需要检查
        //this.checkSuccess();
    }

    /**
     * 放置/移除红旗
     *
     * RULE: 只有在砖块存在的情况下才能操作
     *
     * return boolean
     */
    toggleFlag (x, y) {

        if (!GROUND.isValid(x,y))
            return;

        const block = GROUND.getBlock(x, y);

        if (!block.isBrick)
            return;

        if (block.isFlag) 
        {
            block.clearFlag();
            gFlagsCount --;

            if (block.isMine)
                gFlagsCountYes --;
        }
        // 红旗数量是有限资源，不能超过地雷数量
        else if (gFlagsCount < gMineCount)
        {
            block.setFlag();
            gFlagsCount ++;

            if (block.isMine) {
                gFlagsCountYes ++;

                this.checkSuccess(); // throw
            }
        }

        Refresh();
    }

    /**
     * 检查是否完成任务
     *
     * 不用在意砖块是否都已翻开
     * 只要红旗指出了所有的地雷位置就算胜利
     *
     * throw
     */
    checkSuccess () {
        if (gFlagsCountYes === gMineCount)
        {
            gGameStatus = MINEST_OVER;
            throw MINE_GAME_OVER;
        }
    }

    GameException (e) {

        switch (e) {
            case MINE_GAME_OVER:
                WIDGET.render = this._render_main_gg;
                Refresh();
                break;
            case MINE_INVALID_POS:
                alert('坐标超出范围');
                throw e;
            case MINE_LOGIC_ERROR:
                alert('严重错误');
                throw e;
            default:
                throw e;
        }
    }
}

