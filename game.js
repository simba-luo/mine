"use strict";

// global setting
const BOX_SIZE = 32;
const RES = new ResManager();
const IMG_BLOCK  = RES.LoadImage('block.png');
const IMG_GROUND = RES.LoadImage('ground.png');
const IMG_FLAG   = RES.LoadImage('flag.png');
const IMG_MINE   = RES.LoadImage('mine.png');
const IMG_DIGIT_1 = RES.LoadImage('num_1.png');
const IMG_DIGIT_2 = RES.LoadImage('num_2.png');
const IMG_DIGIT_3 = RES.LoadImage('num_3.png');
const IMG_DIGIT_4 = RES.LoadImage('num_4.png');
const IMG_DIGIT_5 = RES.LoadImage('num_5.png');
const IMG_DIGIT_6 = RES.LoadImage('num_6.png');
const IMG_DIGIT_7 = RES.LoadImage('num_7.png');
const IMG_DIGIT_8 = RES.LoadImage('num_8.png');
const NUMS = [
    null,
    IMG_DIGIT_1,
    IMG_DIGIT_2,
    IMG_DIGIT_3,
    IMG_DIGIT_4,
    IMG_DIGIT_5,
    IMG_DIGIT_6,
    IMG_DIGIT_7,
    IMG_DIGIT_8,
];

let mapData = new MineData(30, 16); // define map(20, 15)
let widget; // game window
let statusBar;

window.onload = function () {

    widget = new Widget;

    /**
     * 绘制界面
     *
     * 游戏结束的显示方式有点不一样
     */
    widget.render = function ({painter}) {

        const isGameOver = mapData.isGameOver();

        for (let y = 0; y < mapData.height; y ++) {
            for (let x = 0; x < mapData.width; x ++) {

                mapData.seek(x, y);

                // draw blocks.
                if (mapData.isBrick()) {
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, IMG_BLOCK);
                } else {
                    // draw ground.
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, IMG_GROUND);

                    let digit = mapData.getNum();
                    // 显示地雷
                    if (mapData.isMine())
                    {
                        painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, IMG_MINE);
                    }
                    // 显示数值
                    else if (digit > 0)
                    {
                        painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, NUMS[digit]);
                    }
                }

                // 绘制红旗
                if (mapData.isFlag()) {
                    painter.drawImage(BOX_SIZE * x, BOX_SIZE * y, IMG_FLAG);
                }
            }
        }
    };

    /**
     * 翻开砖块
     */
    widget.onclick = function (x, y) {

        if (mapData.isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        try {
            mapData.seek(x, y);

            if (mapData.isFlag())
            {
                // do nothing, 红旗不可操作
            }
            else if (mapData.isBrick())
            {
                // 打开砖块
                mapData.clearBrick();
            }
            else if (mapData.getNum() > 0)
            {
                mapData.clearNearby();
            }
            else
            {
                // 剩下的都是空地，不能点击
            }

        } catch (e) {
            GameException(e);
        }
    };

    /**
     * 放置旗帜
     */
    widget.oncontextmenu = function (x, y) {

        if (mapData.isGameOver())
            return;

        x = Math.floor(x / BOX_SIZE);
        y = Math.floor(y / BOX_SIZE);

        if (!mapData.IsValid(x, y))
            return;

        try {
            mapData.seek(x, y);
            mapData.toggleFlag();
        } catch (e) {
            GameException(e);
        }
    };


    // --
    statusBar = new Widget;

    statusBar.render = function ({painter}) {

        // 剩余可用红旗数
        const flagsLeft = mapData.mineCount - mapData.flagsCount;

        painter.clearRect(0, 0, this.width(), this.height());

        painter.save();
        painter.setFont('新宋体', 12, false);
        // Template String
        painter.drawText(10, 40, `FLAG:${flagsLeft}`);
        painter.drawText(100, 40, `PLAYER.id:${movie.id}`);
        painter.restore();

        // if game over
        if (mapData.isGameOver()) {
            painter.save();
            painter.setFont('新宋体', 30, true);
            painter.drawText(100, 40, "GAME OVER");
            painter.restore();
        }
    };

    statusBar.onclick = function (x, y) {
        GameStart();
    };

    RES.then(GameStart);
};

const movie = new Movie(function () {
    widget.update();
    statusBar.update();
});

const GameStart = () => {
    mapData.clear();
    mapData.placeMines(99);
    mapData.ready();

    const win_width  = mapData.width  * BOX_SIZE;
    const win_height = mapData.height * BOX_SIZE;

    // -- show multi windows
    widget.move(30, 30);
    widget.resize(win_width, win_height);
    widget.show();

    statusBar.move(30, 30 + win_height + 10);
    statusBar.resize(win_width, 50);
    statusBar.show();

    // 执行动画
    movie.start();
};

const GameException = (e) => {

    switch (e) {
        case MINE_GAME_OVER:
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
};



