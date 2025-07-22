// シンプルで確実な文字変形おしくらまんじゅう（文字表示を確実に）

class FluidMorphingCharacter {
    constructor(char, position, size, svg) {
        this.char = char;
        this.originalPosition = { ...position };
        this.position = { ...position };
        this.velocity = { x: 0, y: 0 };
        
        // ランダムなサイズと質量（大きいほど強い）
        this.baseSize = size;
        this.sizeVariation = 0.5 + Math.random() * 1.0; // より大きなバリエーション（0.5〜1.5倍）
        this.size = size * this.sizeVariation;
        
        // 文字サイズに基づいて質量を設定（大きい文字ほど重くて強い）
        this.mass = this.sizeVariation * (size / 60); // ベースサイズ60を基準にスケール
        this.radius = this.size * 0.6;
        
        this.damping = 0.96;
        this.repulsionForce = 100;
        this.svg = svg;
        
        // SVG要素
        this.group = null;
        this.textElement = null;
        this.isLoaded = false;
        
        // 音声合成用
        this.lastSoundTime = 0;
        this.soundCooldown = 800;
        
        // 衝突時の瞬間加速用
        this.collisionBoost = 0;
        this.boostDecay = 0.95;
        
        // 色
        this.color = this.getRandomColor();
        
        // 吹き飛び状態フラグ
        this.isExploding = false;
        this.explodingStartTime = 0; // 吹き飛び開始時刻
        this.explodingDuration = 3000; // 3秒後に自動的に通常状態に戻る
        
        // 集まり中フラグ
        this.isGathering = false;
        
        this.createCharacter();
    }
    
    getRandomColor() {
        const colors = [
            '#212529', '#495057', '#6c757d', '#495057',
            '#343a40', '#495057', '#212529', '#6c757d'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    createCharacter() {
        // グループを作成
        this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.group.setAttribute('transform', `translate(${this.position.x}, ${this.position.y})`);
        
        // テキスト要素を作成（確実に表示）
        this.textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        this.textElement.textContent = this.char;
        this.textElement.setAttribute('fill', this.color);
        this.textElement.setAttribute('font-size', this.size);
        this.textElement.setAttribute('font-family', `serif, 'Hiragino Mincho ProN', 'Yu Mincho', '游明朝', 'Times New Roman'`);
        this.textElement.setAttribute('x', 0);
        this.textElement.setAttribute('y', 0);
        this.textElement.setAttribute('text-anchor', 'middle');
        this.textElement.setAttribute('dominant-baseline', 'central');
        
        // 変形を可能にするスタイル
        this.textElement.style.transformOrigin = 'center center';
        this.textElement.style.userSelect = 'none';
        this.textElement.style.webkitUserSelect = 'none';
        this.textElement.style.mozUserSelect = 'none';
        this.textElement.style.msUserSelect = 'none';
        this.textElement.style.pointerEvents = 'none';
        
        this.group.appendChild(this.textElement);
        this.svg.appendChild(this.group);
        
        this.isLoaded = true;
        console.log(`Character ${this.char} created successfully`);
    }
    
    morphCharacter(deformX, deformY, intensity) {
        if (!this.textElement || !this.isLoaded) return;
        
        // シンプルな一時的変形（元の方式に戻す）
        const deformAmount = Math.min(intensity * 0.5, 1.0); // 軽めの変形
        
        // トランジションを無効にして即座に変形
        this.textElement.style.transition = 'none';
        
        // 軽微な変形効果
        const scaleX = Math.max(0.7, 1.0 - deformAmount * 0.3);
        const scaleY = Math.min(1.5, 1.0 + deformAmount * 0.5);
        
        this.textElement.style.transformOrigin = 'center center';
        this.textElement.style.transform = `scale(${scaleX}, ${scaleY})`;
        
        // 軽微なブラー効果
        const blur = Math.min(deformAmount * 0.2, 0.5);
        this.textElement.style.filter = `blur(${blur}px)`;
        
        // 一定時間後に元に戻す
        setTimeout(() => {
            if (this.textElement) {
                this.textElement.style.transform = '';
                this.textElement.style.filter = '';
            }
        }, 150);
    }
    
    restoreShape() {
        // シンプルなリストア（元の状態に戻す）
        if (this.textElement) {
            this.textElement.style.transform = '';
            this.textElement.style.filter = '';
        }
    }
    
    update(characters, repulsionForce, centerPoint) {
        if (!this.isLoaded) return;
        
        this.repulsionForce = repulsionForce;
        
        // 吹き飛び状態の時間管理
        if (this.isExploding && Date.now() - this.explodingStartTime > this.explodingDuration) {
            this.isExploding = false;
            console.log(`Character ${this.char} returned from exploding state`);
        }
        
        const force = { x: 0, y: 0 };
        let hasCollision = false;
        let totalDeformX = 0;
        let totalDeformY = 0;
        let maxIntensity = 0;
        
        // 吹き飛び中は物理演算をスキップ（より自然な放物線運動）
        // 集まり中は特別な処理
        if (!this.isExploding && !this.isGathering) {
            // 通常の物理演算
            // 中央に向かう力（さらに弱く）
            const centerDirection = {
                x: centerPoint.x - this.position.x,
                y: centerPoint.y - this.position.y
            };
            const centerDistance = Math.sqrt(centerDirection.x * centerDirection.x + centerDirection.y * centerDirection.y);
            
            if (centerDistance > 0) {
                const normalizedCenter = {
                    x: centerDirection.x / centerDistance,
                    y: centerDirection.y / centerDistance
                };
                
                const pushToCenterForce = 0.15 / this.mass; // 0.2 から 0.15 に弱める（中心引力を減らして動きを活発に）
                force.x += normalizedCenter.x * pushToCenterForce;
                force.y += normalizedCenter.y * pushToCenterForce;
            }
            
            // 他の文字との相互作用
            characters.forEach(other => {
                if (other !== this && other.isLoaded && !other.isExploding) {
                    const dx = this.position.x - other.position.x;
                    const dy = this.position.y - other.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = (this.radius + other.radius) * 0.8; // 最小距離を80%に短縮
                    
                    if (distance < minDistance) {
                        hasCollision = true;
                        
                        // 距離が0に近い場合の処理（完全重複を防ぐ）
                        let directionX, directionY;
                        if (distance < 1) {
                            // ランダムな方向に分離
                            const angle = Math.random() * Math.PI * 2;
                            directionX = Math.cos(angle);
                            directionY = Math.sin(angle);
                            distance = 1; // 最小距離を設定
                        } else {
                            directionX = dx / distance;
                            directionY = dy / distance;
                        }
                        
                        const overlap = minDistance - distance;
                        
                        // 質量比による力の差
                        const massRatio = other.mass / (this.mass + other.mass);
                        const myForceMultiplier = massRatio;
                        
                        // 重複が大きい場合は強制的に分離
                        const baseRepulsionStrength = overlap * this.repulsionForce * 0.005 * myForceMultiplier; // 0.003 から 0.005 に増加
                        const emergencyMultiplier = overlap > this.radius * 0.5 ? 4 : 1.5; // 通常時も1.5倍、緊急時は4倍
                        
                        const repulsionStrength = baseRepulsionStrength * emergencyMultiplier;
                        force.x += directionX * repulsionStrength;
                        force.y += directionY * repulsionStrength;
                        
                        // 衝突時の瞬間ブースト追加（より強く）
                        this.collisionBoost = Math.max(this.collisionBoost, overlap * 0.04); // 0.02 から 0.04 に倍増
                        
                        // 音を鳴らす
                        this.playSound();
                        
                        // 変形の計算
                        const deformIntensity = (overlap / this.radius) * myForceMultiplier;
                        totalDeformX += -directionX * deformIntensity;
                        totalDeformY += -directionY * deformIntensity;
                        maxIntensity = Math.max(maxIntensity, deformIntensity);
                    }
                }
            });
            
            // 速度更新（ゆっくり）
            this.velocity.x += force.x / this.mass;
            this.velocity.y += force.y / this.mass;
            this.velocity.x *= this.damping;
            this.velocity.y *= this.damping;
            
            // 衝突ブーストを減衰
            this.collisionBoost *= this.boostDecay;
            
            // 最大速度制限（衝突時はブーストで高速化）
            const baseMaxSpeed = 1.5 / this.mass; // 1.0 から 1.5 に増加（基本速度を上げる）
            const boostedMaxSpeed = baseMaxSpeed * (1 + this.collisionBoost * 20); // 15倍から20倍に増加
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
            if (speed > boostedMaxSpeed) {
                this.velocity.x = (this.velocity.x / speed) * boostedMaxSpeed;
                this.velocity.y = (this.velocity.y / speed) * boostedMaxSpeed;
            }
        } else if (this.isGathering) {
            // 集まり中は軽い空気抵抗のみ（勢いを保ちつつ自然な減速）
            this.velocity.x *= 0.998; // 少し強めの基本抵抗
            this.velocity.y *= 0.998;
            
            // 目標地点（中心付近）に近づいたら滑らかに減速する
            const centerDistance = Math.sqrt(
                (this.position.x - centerPoint.x) * (this.position.x - centerPoint.x) + 
                (this.position.y - centerPoint.y) * (this.position.y - centerPoint.y)
            );
            
            // より滑らかな減速カーブ
            let damping = 1.0;
            
            // 段階的ではなく連続的な減速
            if (centerDistance < 250) {
                // 250ピクセルから徐々に減速開始
                const distanceRatio = centerDistance / 250;
                // より滑らかな減速カーブ（指数関数的）
                const smoothFactor = Math.pow(distanceRatio, 0.7); // 0.7乗で滑らかなカーブ
                damping = 0.88 + smoothFactor * 0.1; // 0.88-0.98の範囲で滑らかに変化
                
                this.velocity.x *= damping;
                this.velocity.y *= damping;
            }
            
            // さらに近い場合（100ピクセル以内）は追加の滑らかな減速
            if (centerDistance < 100) {
                const innerRatio = centerDistance / 100;
                const innerSmooth = Math.pow(innerRatio, 0.5); // より緩やかなカーブ
                const innerDamping = 0.75 + innerSmooth * 0.2; // 0.75-0.95の範囲
                
                this.velocity.x *= innerDamping;
                this.velocity.y *= innerDamping;
            }
            
            // 集まり中は他の文字との衝突を軽減（重なりを許可してスムーズに）
            characters.forEach(other => {
                if (other !== this && other.isLoaded && other.isGathering) {
                    const dx = this.position.x - other.position.x;
                    const dy = this.position.y - other.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = (this.radius + other.radius) * 0.6; // より緩い距離制限
                    
                    if (distance < minDistance && distance > 1) {
                        const directionX = dx / distance;
                        const directionY = dy / distance;
                        const overlap = minDistance - distance;
                        
                        // 軽い分離力（集まりを妨げない程度）
                        const separationForce = overlap * 0.003; // さらに弱く（0.005から0.003に）
                        this.velocity.x += directionX * separationForce;
                        this.velocity.y += directionY * separationForce;
                        
                        // 軽い変形効果
                        if (overlap > this.radius * 0.3) {
                            this.morphCharacter(-directionX * 0.1, -directionY * 0.1, overlap / this.radius * 0.25);
                        }
                    }
                }
            });
        } else {
            // 吹き飛び中は重力効果を追加（より自然な放物線運動）
            this.velocity.y += 0.3; // 重力加速度
            
            // 空気抵抗（徐々に減速）
            this.velocity.x *= 0.995;
            this.velocity.y *= 0.998; // Y方向は抵抗少なめ（重力があるため）
        }
        
        // 位置更新
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // 境界チェック（全ての状態で適用）
        const margin = this.radius;
        
        // 境界を超えた場合の処理
        if (this.position.x < margin) {
            this.position.x = margin;
            if (this.velocity.x < 0) {
                this.velocity.x = this.isExploding ? -this.velocity.x * 0.6 : -this.velocity.x * 0.3;
            }
        }
        if (this.position.x > 1000 - margin) {
            this.position.x = 1000 - margin;
            if (this.velocity.x > 0) {
                this.velocity.x = this.isExploding ? -this.velocity.x * 0.6 : -this.velocity.x * 0.3;
            }
        }
        if (this.position.y < margin) {
            this.position.y = margin;
            if (this.velocity.y < 0) {
                this.velocity.y = this.isExploding ? -this.velocity.y * 0.6 : -this.velocity.y * 0.3;
            }
        }
        if (this.position.y > 600 - margin) {
            this.position.y = 600 - margin;
            if (this.velocity.y > 0) {
                this.velocity.y = this.isExploding ? -this.velocity.y * 0.6 : -this.velocity.y * 0.3;
            }
        }
        
        // 集まり中の文字が画面外に行った場合は強制的に中心方向に向かわせる
        if (this.isGathering) {
            const centerDx = centerPoint.x - this.position.x;
            const centerDy = centerPoint.y - this.position.y;
            const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
            
            // 画面端にいる場合は中心向きの力を追加
            if (this.position.x <= this.radius * 2 || this.position.x >= 1000 - this.radius * 2 ||
                this.position.y <= this.radius * 2 || this.position.y >= 600 - this.radius * 2) {
                
                if (centerDistance > 0) {
                    const forceMagnitude = 2.0; // 中心向きの力
                    this.velocity.x += (centerDx / centerDistance) * forceMagnitude;
                    this.velocity.y += (centerDy / centerDistance) * forceMagnitude;
                }
            }
        }
        
        // 重複防止のための最終チェック（他の文字との最小距離を保証）
        if (!this.isExploding) {
            this.ensureMinimumDistance(characters);
        }
        
        // SVG位置を更新
        if (this.group) {
            this.group.setAttribute('transform', `translate(${this.position.x}, ${this.position.y})`);
        }
        
        // 変形を適用
        if (hasCollision && maxIntensity > 0) {
            this.morphCharacter(totalDeformX, totalDeformY, maxIntensity);
            console.log(`${this.char} collision detected! intensity: ${maxIntensity.toFixed(3)}`);
        } else {
            this.restoreShape();
        }
    }
    
    ensureMinimumDistance(characters) {
        // 他の文字との重複を強制的に解決
        characters.forEach(other => {
            if (other !== this && other.isLoaded) {
                const dx = this.position.x - other.position.x;
                const dy = this.position.y - other.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (this.radius + other.radius) * 0.8; // 最小距離を80%に短縮
                
                if (distance < minDistance) {
                    // 重複している場合は強制分離
                    let directionX, directionY;
                    if (distance < 1) {
                        // 完全重複の場合はランダム方向
                        const angle = Math.random() * Math.PI * 2;
                        directionX = Math.cos(angle);
                        directionY = Math.sin(angle);
                    } else {
                        directionX = dx / distance;
                        directionY = dy / distance;
                    }
                    
                    const separation = (minDistance - distance) * 0.5;
                    this.position.x += directionX * separation;
                    this.position.y += directionY * separation;
                    
                    // 境界内に収める
                    const margin = this.radius;
                    this.position.x = Math.max(margin, Math.min(1000 - margin, this.position.x));
                    this.position.y = Math.max(margin, Math.min(600 - margin, this.position.y));
                }
            }
        });
    }
    
    playSound() {
        const now = Date.now();
        if (now - this.lastSoundTime > this.soundCooldown) {
            this.lastSoundTime = now;
            
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(this.char + 'ー');
                utterance.lang = 'ja-JP';
                utterance.volume = 0.1;
                utterance.rate = 0.8;
                utterance.pitch = 0.8 + Math.random() * 0.4;
                
                try {
                    speechSynthesis.speak(utterance);
                } catch (error) {
                    console.log('音声再生エラー:', error);
                }
            }
        }
    }
    
    updateSize(newSize) {
        this.baseSize = newSize;
        this.size = newSize * this.sizeVariation;
        this.radius = this.size * 0.6;
        
        // 質量も文字サイズに応じて更新
        this.mass = this.sizeVariation * (newSize / 60); // ベースサイズ60を基準にスケール
        
        if (this.textElement) {
            this.textElement.setAttribute('font-size', this.size);
        }
        
        console.log(`文字 ${this.char}: サイズ=${this.size.toFixed(1)}, 質量=${this.mass.toFixed(2)}`);
    }
    
    isOffScreen() {
        // 文字が完全に画面外に出たかどうかを判定
        const margin = this.radius + 50; // 余裕を持った判定
        return (
            this.position.x < -margin ||
            this.position.x > 1000 + margin ||
            this.position.y < -margin ||
            this.position.y > 600 + margin
        );
    }
    
    remove() {
        if (this.group && this.group.parentNode) {
            this.group.parentNode.removeChild(this.group);
        }
    }
}

class SVGOshikuraManjuuApp {
    constructor() {
        this.characters = [];
        this.animationId = null;
        this.centerPoint = { x: 500, y: 300 };
        
        this.svg = document.getElementById('svg-canvas');
        
        // スライダーから現在の値を取得して初期化
        this.initializeFromSliders();
        
        this.setupEventListeners();
        this.animate();
    }
    
    initializeFromSliders() {
        // 反発力スライダーから値を取得
        const repulsionSlider = document.getElementById('repulsionSlider');
        this.repulsionForce = repulsionSlider ? parseInt(repulsionSlider.value) : 100;
        
        // 文字サイズスライダーから値を取得
        const sizeSlider = document.getElementById('sizeSlider');
        this.characterSize = sizeSlider ? parseInt(sizeSlider.value) : 60;
        
        console.log(`初期化: 反発力=${this.repulsionForce}, 文字サイズ=${this.characterSize}`);
    }
    
    setupEventListeners() {
        const textInput = document.getElementById('textInput');
        const startButton = document.getElementById('startButton');
        const addButton = document.getElementById('addButton'); // 追加ボタン
        const clearButton = document.getElementById('clearButton');
        const repulsionSlider = document.getElementById('repulsionSlider');
        const repulsionValue = document.getElementById('repulsionValue');
        const sizeSlider = document.getElementById('sizeSlider');
        const sizeValue = document.getElementById('sizeValue');
        
        // SVG全体でテキスト選択を無効化
        this.svg.style.userSelect = 'none';
        this.svg.style.webkitUserSelect = 'none';
        this.svg.style.mozUserSelect = 'none';
        this.svg.style.msUserSelect = 'none';
        
        // SVGクリックイベント（ユーザー介入）
        this.svg.addEventListener('click', (e) => {
            this.handleUserIntervention(e);
        });
        
        startButton.addEventListener('click', () => {
            this.startAnimation(textInput.value);
        });
        
        addButton.addEventListener('click', () => {
            this.addCharacters(textInput.value);
        });
        
        clearButton.addEventListener('click', () => {
            this.clearCharacters();
        });
        
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startAnimation(textInput.value);
            }
        });
        
        repulsionSlider.addEventListener('input', (e) => {
            this.repulsionForce = parseInt(e.target.value);
            repulsionValue.textContent = this.repulsionForce;
        });
        
        sizeSlider.addEventListener('input', (e) => {
            this.characterSize = parseInt(e.target.value);
            sizeValue.textContent = this.characterSize;
            this.updateCharacterSizes();
        });
    }
    
    startAnimation(text) {
        if (!text) return;
        
        // ひらがなのみフィルタ
        const hiraganaText = text.split('').filter(char => 
            (char >= 'あ' && char <= 'ん') || 
            'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'.includes(char) ||
            'ぁぃぅぇぉっゃゅょ'.includes(char)
        ).slice(0, 50);
        
        if (hiraganaText.length === 0) {
            alert('ひらがなを入力してください！');
            return;
        }
        
        // 入力欄を自動的にクリア
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.value = '';
        }
        
        // 既存の文字がある場合は先に吹き飛ばす
        if (this.characters.length > 0) {
            this.clearCharactersQuickly(() => {
                // 吹き飛ばし完了後に新しい文字を作成
                this.createCharacters(hiraganaText);
            });
        } else {
            // 既存文字がない場合は直接作成
            this.createCharacters(hiraganaText);
        }
    }
    
    addCharacters(text) {
        if (!text) return;
        
        // ひらがなのみフィルタ
        const hiraganaText = text.split('').filter(char => 
            (char >= 'あ' && char <= 'ん') || 
            'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'.includes(char) ||
            'ぁぃぅぇぉっゃゅょ'.includes(char)
        );
        
        if (hiraganaText.length === 0) {
            alert('ひらがなを入力してください！');
            return;
        }
        
        // 同じ文字でも追加可能に（重複チェック削除）
        const newChars = hiraganaText;
        
        // 現在の文字数と新しい文字数の合計をチェック
        const totalCount = this.characters.length + newChars.length;
        if (totalCount > 50) {
            const allowedCount = 50 - this.characters.length;
            if (allowedCount <= 0) {
                alert('最大50文字まで表示できます。まずリセットしてください。');
                return;
            }
            newChars.splice(allowedCount); // 制限を超える分をカット
            alert(`最大50文字まで表示できます。${allowedCount}文字のみ追加します。`);
        }
        
        this.createAdditionalCharacters(newChars);
        
        // 入力欄を自動的にクリア
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.value = '';
        }
    }
    
    createAdditionalCharacters(newChars) {
        newChars.forEach((char, index) => {
            // 既存の文字の配置を考慮して、空いているスペースに配置
            const existingPositions = this.characters.map(character => ({
                x: character.position.x,
                y: character.position.y,
                radius: character.radius
            }));
            
            // 画面外のランダムな位置から開始（既存の配置と同様）
            const baseDirection = Math.random() * Math.PI * 2;
            const randomOffset = (Math.random() - 0.5) * Math.PI * 0.8;
            const startDirection = baseDirection + randomOffset;
            
            const minDistance = 150;
            const maxDistance = 300; // 400から300に短縮（画面外に行きすぎるのを防ぐ）
            const startDistance = minDistance + Math.random() * (maxDistance - minDistance);
            
            const startX = this.centerPoint.x + Math.cos(startDirection) * startDistance;
            const startY = this.centerPoint.y + Math.sin(startDirection) * startDistance;
            
            // 目標位置を既存の文字と重ならないように配置
            let targetX, targetY;
            let attempts = 0;
            const maxAttempts = 50;
            
            do {
                // ランダムな角度で中央周辺に配置
                const angle = Math.random() * Math.PI * 2;
                const radius = 80 + Math.random() * 80; // 120-180から80-160に縮小（中心に近く）
                targetX = this.centerPoint.x + Math.cos(angle) * radius;
                targetY = this.centerPoint.y + Math.sin(angle) * radius;
                attempts++;
            } while (attempts < maxAttempts && this.isPositionOccupied(targetX, targetY, existingPositions));
            
            // 境界内に収める
            const margin = this.characterSize * 0.6;
            targetX = Math.max(margin, Math.min(1000 - margin, targetX));
            targetY = Math.max(margin, Math.min(600 - margin, targetY));
            
            // 新しい文字を作成
            const character = new FluidMorphingCharacter(char, { x: startX, y: startY }, this.characterSize, this.svg);
            
            // 集まり状態を設定
            character.isGathering = true;
            character.gatheringStartTime = performance.now(); // 集まり開始時間を設定
            
            // 目標位置への方向と速度を計算
            const dx = targetX - startX;
            const dy = targetY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) { // ゼロ除算を防ぐ
                const directionX = dx / distance;
                const directionY = dy / distance;
                
                // より強い初速（画面外に行かないように）
                const baseSpeed = 15 + Math.random() * 10; // 12-20から15-25に増強
                const speedMultiplier = Math.max(1.0, Math.min(2.0, distance / 100)); // 距離による調整を強化
                const finalSpeed = baseSpeed * speedMultiplier;
                
                character.velocity.x = directionX * finalSpeed;
                character.velocity.y = directionY * finalSpeed;
                
                // 変形効果
                const morphIntensity = 0.8 + Math.random() * 0.6;
                character.morphCharacter(
                    directionX * morphIntensity * 0.5,
                    directionY * morphIntensity * 0.5,
                    morphIntensity
                );
                
                console.log(`Added character ${char} from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${targetX.toFixed(1)}, ${targetY.toFixed(1)}) with speed ${finalSpeed.toFixed(1)}`);
            } else {
                // 距離が0の場合は中心向きの強い速度を設定
                const centerDx = this.centerPoint.x - startX;
                const centerDy = this.centerPoint.y - startY;
                const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
                
                if (centerDistance > 0) {
                    const speed = 15;
                    character.velocity.x = (centerDx / centerDistance) * speed;
                    character.velocity.y = (centerDy / centerDistance) * speed;
                } else {
                    character.velocity.x = 0;
                    character.velocity.y = 0;
                }
                console.log(`Added character ${char} with fallback center-directed velocity`);
            }
            
            character.collisionBoost = 1.2 + Math.random() * 1.0;
            
            this.characters.push(character);
        });
        
        // 1.5秒後に通常の物理演算に戻る
        setTimeout(() => {
            this.characters.forEach(character => {
                if (character.isGathering) {
                    character.restoreShape();
                    character.isGathering = false;
                }
            });
        }, 1500);
    }
    
    isPositionOccupied(x, y, existingPositions) {
        const minDistance = this.characterSize * 1.2; // 文字サイズの1.2倍の距離を最小とする
        
        return existingPositions.some(pos => {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < minDistance + pos.radius;
        });
    }
    
    createCharacters(characters) {
        characters.forEach((char, index) => {
            // 最終的な目標位置（円形配置）
            const angle = (index / characters.length) * Math.PI * 2;
            const radius = 120;
            const targetX = this.centerPoint.x + Math.cos(angle) * radius;
            const targetY = this.centerPoint.y + Math.sin(angle) * radius;
            
            // より自然な散り散り配置での開始位置
            // 基本方向に大きなランダム偏差を追加
            const baseDirection = Math.random() * Math.PI * 2; // 完全にランダムな基本方向
            const randomOffset = (Math.random() - 0.5) * Math.PI * 0.8; // ±72度のランダム偏差
            const startDirection = baseDirection + randomOffset;
            
            // 画面外の距離もランダムに（より自然な散らばり）
            const minDistance = 150; // 最小距離
            const maxDistance = 400; // 最大距離
            const startDistance = minDistance + Math.random() * (maxDistance - minDistance);
            
            // 画面外の開始位置を計算
            const startX = this.centerPoint.x + Math.cos(startDirection) * startDistance;
            const startY = this.centerPoint.y + Math.sin(startDirection) * startDistance;
            
            // 文字を画面外の位置で作成
            const character = new FluidMorphingCharacter(char, { x: startX, y: startY }, this.characterSize, this.svg);
            
            // 集まり状態を設定
            character.isGathering = true;
            
            // 目標位置への方向と速度を計算
            const dx = targetX - startX;
            const dy = targetY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 正規化された方向ベクトル
            const directionX = dx / distance;
            const directionY = dy / distance;
            
            // より勢いのある初速（少し控えめに調整）
            const baseSpeed = 8 + Math.random() * 10; // 8-18のランダム速度（以前より少し遅く）
            const speedMultiplier = Math.min(1.0, distance / 200); // 距離による調整（近すぎる場合は減速）
            const finalSpeed = baseSpeed * speedMultiplier;
            
            character.velocity.x = directionX * finalSpeed;
            character.velocity.y = directionY * finalSpeed;
            
            // より激しい集まる際の変形効果
            const morphIntensity = 0.8 + Math.random() * 0.6; // 0.8-1.4のランダム
            character.morphCharacter(
                directionX * morphIntensity * 0.5,
                directionY * morphIntensity * 0.5,
                morphIntensity
            );
            
            // 各文字に異なる衝突ブーストを設定（散り散りと同じレベル）
            character.collisionBoost = 1.2 + Math.random() * 1.0; // 1.2-2.2のランダム
            
            this.characters.push(character);
        });
        
        // 1.5秒後に通常の物理演算に戻る（より長めに）
        setTimeout(() => {
            this.characters.forEach(character => {
                character.restoreShape();
                character.isGathering = false; // 集まり状態を解除
            });
        }, 1500);
    }
    
    handleUserIntervention(e) {
        // SVG座標系でのクリック位置を取得
        const rect = this.svg.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 1000;
        const clickY = ((e.clientY - rect.top) / rect.height) * 600;
        
        const forceStrength = 25; // 吹き飛ばし力
        
        // クリック位置に視覚効果を追加
        this.createClickEffect(clickX, clickY);
        
        // 全ての文字に力を適用
        this.characters.forEach(character => {
            const dx = character.position.x - clickX;
            const dy = character.position.y - clickY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                // 距離に応じて力を減衰（近いほど強い力）
                const maxEffectDistance = 200;
                const effectStrength = Math.max(0, 1 - (distance / maxEffectDistance));
                
                if (effectStrength > 0) {
                    const directionX = dx / distance;
                    const directionY = dy / distance;
                    
                    // 質量に応じて力を調整（重い文字は動きにくい）
                    const massAdjustedForce = forceStrength * effectStrength / character.mass;
                    
                    // 速度に力を追加
                    character.velocity.x += directionX * massAdjustedForce;
                    character.velocity.y += directionY * massAdjustedForce;
                    
                    // 衝突ブーストも追加（動きを活発に）
                    character.collisionBoost = Math.max(character.collisionBoost, effectStrength * 0.5);
                    
                    // 変形効果も追加
                    character.morphCharacter(-directionX * effectStrength, -directionY * effectStrength, effectStrength * 0.8);
                }
            }
        });
    }
    
    createClickEffect(x, y) {
        // クリック位置に一時的な視覚効果を作成
        const effectGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        effectGroup.setAttribute('transform', `translate(${x}, ${y})`);
        
        // 外側の円（衝撃波）
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('r', '5');
        outerCircle.setAttribute('fill', 'none');
        outerCircle.setAttribute('stroke', '#6c757d'); // オレンジからグレーに変更
        outerCircle.setAttribute('stroke-width', '3');
        outerCircle.setAttribute('opacity', '0.8');
        
        // 内側の円（コア）
        const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        innerCircle.setAttribute('r', '2');
        innerCircle.setAttribute('fill', '#96b4ceff'); // オレンジからグレーに変更
        innerCircle.setAttribute('opacity', '0.6');
        
        effectGroup.appendChild(outerCircle);
        effectGroup.appendChild(innerCircle);
        this.svg.appendChild(effectGroup);
        
        // アニメーション
        let radius = 5;
        let opacity = 0.8;
        const animate = () => {
            radius += 4; // 大きく拡散
            opacity -= 0.05;
            
            outerCircle.setAttribute('r', radius);
            outerCircle.setAttribute('opacity', opacity);
            innerCircle.setAttribute('opacity', opacity * 0.7);
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                // エフェクト削除
                if (effectGroup.parentNode) {
                    effectGroup.parentNode.removeChild(effectGroup);
                }
            }
        };
        
        animate();
    }
    
    animate() {
        // 文字を更新
        this.characters.forEach(character => {
            character.update(this.characters, this.repulsionForce, this.centerPoint);
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updateCharacterSizes() {
        this.characters.forEach(character => {
            character.updateSize(this.characterSize);
        });
    }
    
    clearCharactersQuickly(callback) {
        if (this.characters.length === 0) {
            if (callback) callback();
            return;
        }
        
        // 既存の文字を素早く吹き飛ばす
        this.characters.forEach(character => {
            character.isExploding = true;
            character.explodingStartTime = Date.now();
            
            // より強力な吹き飛ばし
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 15; // より高速
            
            character.velocity.x = Math.cos(angle) * speed;
            character.velocity.y = Math.sin(angle) * speed;
            character.collisionBoost = 3.0;
            
            character.morphCharacter(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3,
                1.0
            );
        });
        
        // より短い時間で削除（0.8秒）
        setTimeout(() => {
            this.characters.forEach(character => {
                character.remove();
            });
            this.characters = [];
            
            // コールバック実行
            if (callback) callback();
        }, 800);
    }
    
    clearCharacters() {
        if (this.characters.length === 0) {
            return;
        }
        
        // 文字達を四方八方に散り散りに吹き飛ばす
        this.characters.forEach((character, index) => {
            // 吹き飛び状態を設定
            character.isExploding = true;
            character.explodingStartTime = Date.now();
            
            // より散り散りになるようにランダム性を強化
            const baseAngle = (index / this.characters.length) * Math.PI * 2; // 基本方向
            const randomOffset = (Math.random() - 0.5) * Math.PI; // ±90度のランダム偏差
            const angle = baseAngle + randomOffset;
            
            // 速度にもランダム性を追加（より大きな差をつける）
            const baseSpeed = 12;
            const speedVariation = Math.random() * 18; // 0-18の追加速度
            const speed = baseSpeed + speedVariation;
            
            character.velocity.x = Math.cos(angle) * speed;
            character.velocity.y = Math.sin(angle) * speed;
            
            // 各文字に異なる衝突ブーストを設定
            character.collisionBoost = 1.5 + Math.random() * 1.0; // 1.5-2.5のランダム
            
            // 激しい変形効果（各文字で異なる）
            character.morphCharacter(
                (Math.random() - 0.5) * 4, 
                (Math.random() - 0.5) * 4, 
                1.2 + Math.random() * 0.6 // 1.2-1.8のランダム強度
            );
        });
        
        // 個別に画面外チェックして削除
        const checkAndRemove = () => {
            // 画面外に出た文字を特定して削除
            const toRemove = [];
            this.characters.forEach((character, index) => {
                if (character.isOffScreen()) {
                    character.remove();
                    toRemove.push(index);
                }
            });
            
            // 配列から削除（後ろから削除してインデックスが狂わないようにする）
            toRemove.reverse().forEach(index => {
                this.characters.splice(index, 1);
            });
            
            // まだ画面内に文字が残っている場合は継続チェック
            if (this.characters.length > 0 && this.characters.some(char => char.isExploding)) {
                setTimeout(checkAndRemove, 100); // 100msごとにチェック
            }
        };
        
        // チェック開始（少し遅延してから）
        setTimeout(checkAndRemove, 200);
        
        // 入力欄のみクリア（スライダーはそのまま維持）
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.value = '';
        }
    }
}

// アプリケーションを初期化
window.addEventListener('load', () => {
    // ページ読み込み時に入力欄のみクリア（スライダーは維持）
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.value = '';
    }
    
    new SVGOshikuraManjuuApp();
});
