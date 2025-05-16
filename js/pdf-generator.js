'use strict';

console.log('pdf-generator.js loading...');

// --- PDF生成関数 ---
window.generatePDF = function() {
    console.log("Generating PDF...");
    
    // 必要なDOM要素の取得
    const pdfContent = document.getElementById('pdfContent');
    
    if (!pdfContent) {
        console.error("pdfContent element not found");
        alert('PDF生成に必要な要素が見つかりません。');
        return;
    }
    
    // 見積データのバリデーション
    if (!window.currentItems || window.currentItems.length === 0) {
        const calculated = document.getElementById('calculateBtn')?.dataset?.calculated === 'true';
        if (!calculated) {
            alert('まず「計算する」ボタンを押して見積を計算してください。');
            if (typeof window.debugLog === 'function') {
                window.debugLog('PDF generation aborted: No estimate calculated', 'warn');
            }
            return;
        }
    }
    
    // ローディングスピナー表示
    if (typeof window.showLoadingSpinner === 'function') {
        window.showLoadingSpinner('PDFを生成中...');
    }
    
    // シミュレーションのみ: 実際のPDF生成ロジック
    simulatePdfGeneration()
        .then(function(blob) {
            const url = URL.createObjectURL(blob);
            const filename = getFilename();
            
            // PDFをダウンロード
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // BlobURLの解放
            setTimeout(function() {
                URL.revokeObjectURL(url);
            }, 1000);
            
            // ローディングスピナー非表示
            if (typeof window.hideLoadingSpinner === 'function') {
                window.hideLoadingSpinner();
            }
            
            if (typeof window.debugLog === 'function') {
                window.debugLog(`PDF generated and downloaded as ${filename}`, 'info');
            }
        })
        .catch(function(error) {
            console.error('PDF generation error:', error);
            
            // エラー表示
            if (typeof window.showLoadingError === 'function') {
                window.showLoadingError('PDF生成中にエラーが発生しました。ブラウザの設定を確認し、再試行してください。');
            } else if (typeof window.hideLoadingSpinner === 'function') {
                window.hideLoadingSpinner();
                alert('PDF生成中にエラーが発生しました。ブラウザの設定を確認し、再試行してください。');
            }
            
            if (typeof window.debugLog === 'function') {
                window.debugLog('PDF generation failed: ' + error.message, 'error');
            }
        });
    
    // タイムアウト設定
    window.pdfGenerationTimeout = setTimeout(function() {
        if (window.pdfGenerationCancelled) return;
        
        if (typeof window.showLoadingError === 'function') {
            window.showLoadingError('PDF生成がタイムアウトしました。印刷機能を使用するか、再試行してください。');
        }
        
        if (typeof window.debugLog === 'function') {
            window.debugLog(`PDF generation timed out after ${window.pdfTimeoutValue} seconds`, 'error');
        }
    }, (window.pdfTimeoutValue || 15) * 1000);
};

// PDF生成のシミュレーション（実際の実装に置き換える）
function simulatePdfGeneration() {
    return new Promise((resolve, reject) => {
        // 模擬的な処理遅延
        const delay = Math.random() * 1000 + 500; // 0.5〜1.5秒
        
        setTimeout(() => {
            if (window.pdfGenerationCancelled) {
                reject(new Error('PDF generation was cancelled'));
                return;
            }
            
            // ダミーPDFデータ（実際の実装では、pdfContent の内容からPDFを生成）
            const dummyPdfData = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10]);
            const blob = new Blob([dummyPdfData], { type: 'application/pdf' });
            
            resolve(blob);
        }, delay);
    });
}

// --- 印刷機能 ---
window.printEstimate = function() {
    console.log("Printing estimate...");
    
    // 必要なDOM要素の取得
    const pdfContent = document.getElementById('pdfContent');
    
    if (!pdfContent) {
        console.error("pdfContent element not found");
        alert('印刷に必要な要素が見つかりません。');
        return;
    }
    
    // 見積データのバリデーション
    if (!window.currentItems || window.currentItems.length === 0) {
        const calculated = document.getElementById('calculateBtn')?.dataset?.calculated === 'true';
        if (!calculated) {
            alert('まず「計算する」ボタンを押して見積を計算してください。');
            if (typeof window.debugLog === 'function') {
                window.debugLog('Print aborted: No estimate calculated', 'warn');
            }
            return;
        }
    }
    
    // 印刷プレビューを開く
    try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('印刷ウィンドウを開けませんでした。ポップアップがブロックされている可能性があります。');
            if (typeof window.debugLog === 'function') {
                window.debugLog('Print window could not be opened', 'error');
            }
            return;
        }
        
        // プリントスタイルシートを含む印刷用HTMLを生成
        const printContent = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <title>見積書</title>
                <style>
                    body {
                        font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
                        margin: 0;
                        padding: 0;
                    }
                    .print-container {
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 10mm;
                    }
                    ${getPrintStyles()}
                </style>
            </head>
            <body>
                <div class="print-container">
                    ${pdfContent.innerHTML}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 500);
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        if (typeof window.debugLog === 'function') {
            window.debugLog('Print window opened', 'info');
        }
    } catch (error) {
        console.error('Print error:', error);
        alert('印刷中にエラーが発生しました: ' + error.message);
        
        if (typeof window.debugLog === 'function') {
            window.debugLog('Print failed: ' + error.message, 'error');
        }
    }
};

// 印刷用スタイルの取得
function getPrintStyles() {
    return `
        .estimate-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .doc-title {
            font-size: 24px;
            font-weight: bold;
        }
        .doc-info {
            text-align: right;
        }
        .client-info {
            margin-bottom: 20px;
        }
        .client-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .project {
            font-size: 16px;
        }
        .company-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .company-details {
            flex: 2;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .company-stamp, .company-logo {
            flex: 1;
            text-align: right;
        }
        .stamp-image, .logo-image {
            max-width: 100px;
            max-height: 100px;
        }
        .estimate-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .estimate-table th, .estimate-table td {
            border: 1px solid #000;
            padding: 8px;
        }
        .estimate-table th {
            background-color: #f0f0f0;
            text-align: center;
        }
        .item-no { width: 5%; }
        .item-desc { width: 40%; }
        .item-quantity { width: 10%; text-align: right; }
        .item-unit { width: 10%; text-align: center; }
        .item-price { width: 15%; text-align: right; }
        .item-amount { width: 20%; text-align: right; }
        .total-amount { font-weight: bold; }
        .estimate-notes {
            border: 1px solid #000;
            padding: 10px;
        }
        .estimate-notes h4 {
            margin-top: 0;
            margin-bottom: 10px;
        }
        .note-items div {
            margin-bottom: 5px;
        }
        .no-data {
            text-align: center;
            padding: 20px;
            font-style: italic;
            color: #666;
        }
        tfoot td {
            font-weight: bold;
        }
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body {
                margin: 1cm;
            }
        }
    `;
}

// ファイル名の生成
function getFilename() {
    const client = document.getElementById('client')?.value || '顧客';
    const estimateNumber = document.getElementById('estimateNumber')?.value || '';
    const now = new Date();
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    
    // スペースや特殊文字をアンダースコアに置換
    const cleanClient = client.replace(/[\/\\\:\*\?"<>\|]/g, '_').replace(/\s+/g, '_');
    
    if (estimateNumber) {
        return `見積書_${cleanClient}_${estimateNumber}.pdf`;
    } else {
        return `見積書_${cleanClient}_${dateStr}.pdf`;
    }
}

console.log('pdf-generator.js loaded successfully!');
