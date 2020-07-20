

/**
 * 游戏结束，无论成功或失败。
 */
const MINE_GAME_OVER   = Symbol('game over');
/**
 * 使用了非法坐标
 */
const MINE_INVALID_POS = Symbol('invalid position');
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


class HotSpot {
    x = 0;
    y = 0;
    type = null;
}


/**
 * usage:
 *
 * let map = new MineSweeper(width, height);
 * map.resetMines(num);
 * map.ready();
 *
 * use `map.isGameOver()' to check whether game is over
 */
class MineSweeper {

    // state
    mineCount = 0;     // 当前存在的地雷数
    flagsCount = 0;    // 当前已用的红旗数
    flagsCountYes = 0; // 有效红旗数
    uncleanBricks = 0; // 剩余未清除砖块数量
    _status = MINEST_PENDING;
    _bg = null;
    _dev_gnd = null;
    _hot = new HotSpot;

    /**
     * 鼠标左键按下时，记录坐标和类型
     */
    _slot_mousedown = (x, y) => {

        if (this.isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        this.setHot(x, y);
        this.refresh();
    };

    /**
     * 鼠标释放时，清除热点
     */
    _slot_mouseup = (x, y) => {

        if (this.isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        this.clearHot();
        this.refresh();
    };

    /**
     * 右键放置红旗
     */
    _slot_contextmenu = (x, y) => {
        if (this.isGameOver())
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
        if (this.isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        try {
            const block = this.seek(x, y);

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
        painter.drawImage(0, 0, this.GROUND);

        for (let y = 0; y < this.height; y ++) {
            for (let x = 0; x < this.width; x ++) {

                const block = this.seek(x, y);

                if (block.isBrick)
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, RES.BRICK);

                if (block.isFlag)
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, RES.FLAG);
            }
        }

        if (this.HOT.type === 'NUM') {

            const surrounds = this.surroundPositions(this.HOT.x, this.HOT.y);

            for (const [x, y] of surrounds) {

                const sr = this.seek(x, y);

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
        painter.drawImage(0, 0, this.GROUND);

        for (let y = 0; y < this.height; y ++) {
            for (let x = 0; x < this.width; x ++) {

                const block = this.seek(x, y);

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


    _render_status = (painter) => {
        // 剩余可用红旗数
        const flagsLeft = this.mineCount - this.flagsCount;

        painter.setBrush(COLOR_WINDOW_BG);
        painter.fillRect(-2, -2, STATUS.width + 4, STATUS.height + 4);

        painter.setFont('Monospace', 12, false);
        painter.setBrush('black');
        // Template String
        painter.drawText(10, 30, `FLAG:${flagsLeft}`);
    };


    constructor (wid, hgt) {
        this._bg = new MineBattleground(wid, hgt);
        this._dev_gnd = new OffscreenCanvas(wid * BOX_SIZE, hgt * BOX_SIZE);

        WIDGET.onclick       = this._slot_click2;
        WIDGET.oncontextmenu = this._slot_contextmenu;
        WIDGET.onmousedown   = this._slot_mousedown;
        WIDGET.onmouseup     = this._slot_mouseup;

        STATUS.render = this._render_status;
    }

    get width () {
        return this._bg.width;
    }

    get height () {
        return this._bg.height;
    }

    get GROUND () {
        return this._dev_gnd;
    }

    /**
     * get MineBlock of 当前定位
     *
     * return MineBlock, throw symbol
     */
    seek (x, y) {

        if (!this.IsValid(x, y))
            throw MINE_INVALID_POS;

        return this._bg.getBlock(x, y);
    }

    /**
     * whether game is over
     */
    isGameOver () {
        return this._status === MINEST_OVER;
    }

    /**
     * 清理周围的砖块
     *
     * RULE: 只能对数值区域操作
     *
     * RULE: 只有周围红旗数和当前数值对应才会进行
     */
    clearNearby (x, y) {

        const block = this._bg.getBlock(x, y);

        if (block.isFlag || block.isBrick || block.num <= 0)
            return;

        const nearby = this._bg.surroundPositions(x, y);

        // 建立 nearby 与 list 的映射关系
        const list = nearby.map(
            ([x, y]) => {
                return (
                    this._bg.getBlock(x, y).isFlag
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

        this._status = MINEST_PENDING;

        if (max > this._bg.size)
            throw MINE_LOGIC_ERROR;

        this._bg.placeMines(max);
        this._bg.ready();


        // ECMA 23.2 Set Object
        //const dict = new Set;
        // dict.has();
        // dict.add();

        this.mineCount = max;
        this.flagsCount = 0;
        this.flagsCountYes = 0;
        this.uncleanBricks = this._bg.size;
        this._status = MINEST_START;
    }

    // init ground ui
    ready () {

        const painter = new Painter(this.GROUND);

        for (let j = 0; j < this.height; j ++) {
            for (let i = 0; i < this.width; i ++) {

                const block = this.seek(i, j);

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
        STATUS.resize(this.width * BOX_SIZE, 40);
        BTN_START.move(STATUS.width/2-15, 5);

        WIDGET.move(15, 15 + 50);
        WIDGET.resize(this.width * BOX_SIZE, this.height * BOX_SIZE);
        WIDGET.render = this._render_main;
    }

	IsValid (x, y) {
        return this._bg.isValid(x, y);
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

        if (!this.IsValid(x, y))
            return;

        const block = this._bg.getBlock(x, y);

        if (block.isFlag)
            return;

        if (!block.isBrick)
            return;

        block.clearBrick();
        this.uncleanBricks --;
        this.refresh();

        // see what's under the brick
        // isMine? then you are dead
        if (block.isMine)
        {
            const p = new Painter(this.GROUND);
            p.drawImage(BOX_SIZE * x, BOX_SIZE * y, RES.BOOM);
            this._status = MINEST_OVER;
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

        if (!this.IsValid(x,y))
            return;

        const block = this._bg.getBlock(x, y);

        if (!block.isBrick)
            return;

        if (block.isFlag) 
        {
            block.clearFlag();
            this.flagsCount --;

            if (block.isMine)
                this.flagsCountYes --;
        }
        // 红旗数量是有限资源，不能超过地雷数量
        else if (this.flagsCount < this.mineCount)
        {
            block.setFlag();
            this.flagsCount ++;

            if (block.isMine) {
                this.flagsCountYes ++;

                this.checkSuccess(); // throw
            }
        }

        this.refresh();
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
        if (this.flagsCountYes === this.mineCount)
        {
            this._status = MINEST_OVER;
            throw MINE_GAME_OVER;
        }
    }

    surroundPositions (x, y) {
        return this._bg.surroundPositions(x, y);
    }

    /**
     * 更新 UI 界面
     */
    refresh () {

        window.requestAnimationFrame(() => {
            SCREEN.update();
        });
    }

    get HOT () {
        return this._hot;
    }

    clearHot () {
        this.HOT.type = null;
    }

    setHot (x, y) {
        if (!this.IsValid(x, y))
            return;

        this.HOT.x = x;
        this.HOT.y = y;

        const block = this.seek(x, y);

        if (block.isFlag)
        {
            // do nothing
        }
        else if (block.isBrick)
        {
            // do nothing
        }
        else if (block.num > 0)
        {
            this.HOT.type = 'NUM';
        }
    }

    GameException (e) {

        switch (e) {
            case MINE_GAME_OVER:
                WIDGET.render = this._render_main_gg;
                this.refresh();
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

