/**
 * 自動見積作成システム - PDF生成JavaScriptファイル
 * PDF生成、ダウンロード、印刷機能を担当
 */
'use strict';

/**
 * PDF生成とダウンロード
 * html2canvasとjsPDFを使用して見積書をPDF化
 */
async function generatePDF() {
    if (!document.getElementById('calculateBtn').dataset.calculated) { 
        alert('先に見積を計算してください。'); 
        return; 
    }
    
    window.pdfGenerationCancelled = false;
    window.ui.showLoadingSpinner('PDFを生成中...');
    
    try {
        // 見積書HTMLをPDF用コンテナに設定
        const pdfEstimateSheet = document.getElementById('pdfEstimateSheet');
        pdfEstimateSheet.innerHTML = window.calc.generateEstimateHTML();
        window.app.debugLog('PDF用見積書HTMLを生成しました', 'info');
        
        // 会社ロゴと印影の設定
        setupPdfImages(pdfEstimateSheet);
        
        // PDF用コンテナを表示してレンダリング準備
        document.getElementById('pdfContent').style.display = 'block';
        await new Promise(resolve => setTimeout(resolve, 500)); // レンダリング待ち
        
        // キャンセル確認
        if (window.pdfGenerationCancelled) throw new Error("キャンセルされました");
        
        // html2canvasでキャプチャ
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(document.getElementById('pdfContent'), {
            scale: 2, 
            useCORS: true, 
            allowTaint: false, 
            logging: window.app.isDebugMode,
            scrollX: 0, 
            scrollY: 0,
            windowWidth: document.getElementById('pdfContent').scrollWidth, 
            windowHeight: document.getElementById('pdfContent').scrollHeight
        });
        
        // キャンセル確認
        if (window.pdfGenerationCancelled) throw new Error("キャンセルされました");
        
        // jsPDFでPDF生成
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({ 
            orientation: 'portrait', 
            unit: 'mm', 
            format: 'a4' 
        });
        
        // イメージの挿入
        await insertImageToPdf(pdf, imgData);
        
        // ファイル名の生成とダウンロード
        const clientName = document.getElementById('client').value.trim().replace(/[\\/:*?"<>|]/g, '_') || '見積書';
        const dateStr = document.getElementById('estimateDate').value.replace(/-/g, '') || formatDateForFilename(new Date());
        const fileName = `見積書_${clientName}_${dateStr}.pdf`;
        
        pdf.save(fileName);
        window.app.debugLog(`PDFを保存しました: ${fileName}`, 'info');
        
    } catch (e) {
        if (e.message !== "キャンセルされました") {
            console.error('PDF生成エラー:', e);
            window.app.debugLog('PDF生成エラー: ' + e.message, 'error');
            alert('PDF生成中にエラーが発生しました。\n内容が複雑すぎるか、画像に問題がある可能性があります。\nブラウザの印刷機能で代用してください。');
            
            const spinnerActions = document.getElementById('spinnerActions');
            const alternativePdfBtn = document.getElementById('alternativePdfBtn');
            const cancelPdfBtn = document.getElementById('cancelPdfBtn');
            
            spinnerActions.style.display = 'flex';
            alternativePdfBtn.style.display = 'inline-block';
            cancelPdfBtn.textContent = '閉じる';
            window.pdfGenerationTimeout = null;
        } else {
            window.app.debugLog('PDF生成がキャンセルされました', 'warn');
        }
    } finally {
        if (!window.pdfGenerationCancelled || document.getElementById('cancelPdfBtn').textContent === '閉じる') {
            window.ui.hideLoadingSpinner();
        }
        
        document.getElementById('pdfContent').style.display = 'none';
        document.getElementById('cancelPdfBtn').textContent = 'キャンセル';
        window.app.debugLog('PDF生成処理が完了または中断されました', 'info');
    }
}

/**
 * PDFに画像を挿入
 * @param {Object} pdf - jsPDFオブジェクト
 * @param {string} imgData - 画像データURL
 */
async function insertImageToPdf(pdf, imgData) {
    try {
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = pdfHeight;
        let position = 0;
        const margin = 10;
        
        pdf.addImage(imgData, 'JPEG', margin, margin, pdfWidth - margin * 2, pdfHeight - margin);
        heightLeft -= (pageHeight - margin * 2);
        
        // マルチページ対応
        while (heightLeft > margin) {
            position -= (pageHeight - margin * 2);
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position + margin, pdfWidth - margin * 2, pdfHeight);
            heightLeft -= (pageHeight - margin * 2);
            
            // ページ制限
            if (pdf.internal.getNumberOfPages() > 10) {
                throw new Error("PDFページ数が上限（10ページ）を超えました");
            }
        }
    } catch (e) {
        window.app.debugLog('PDF画像挿入エラー: ' + e.message, 'error');
        throw e;
    }
}

/**
 * PDF用の画像設定
 * @param {HTMLElement} container - 画像を追加するコンテナ要素
 */
function setupPdfImages(container) {
    try {
        const headerElement = container.querySelector('.estimate-header');
        const companyInfoElement = container.querySelector('.company-info');
        
        // 既存の印影を一時非表示
        const existingStamp = container.querySelector('.company-stamp');
        if (existingStamp) existingStamp.style.display = 'none';
        
        // 会社ロゴの追加
        if (window.app.companyInfo.logo && headerElement) {
            const logoImg = new Image();
            logoImg.onload = () => { 
                window.app.debugLog('会社ロゴを読み込みました', 'info'); 
            };
            logoImg.onerror = () => { 
                window.app.debugLog('会社ロゴの読み込みに失敗しました', 'warn'); 
            };
            logoImg.src = window.app.companyInfo.logo;
            logoImg.className = 'company-logo';
            logoImg.style.position = 'absolute';
            logoImg.style.top = '0px';
            logoImg.style.right = '0px';
            
            // 既存のロゴを削除
            const oldLogo = headerElement.querySelector('.company-logo');
            if (oldLogo) oldLogo.remove();
            
            headerElement.appendChild(logoImg);
        }
        
        // 印影の追加
        if (window.app.companyInfo.stamp && companyInfoElement) {
            const stampImg = new Image();
            stampImg.onload = () => { 
                window.app.debugLog('印影を読み込みました', 'info'); 
            };
            stampImg.onerror = () => { 
                window.app.debugLog('印影の読み込みに失敗しました', 'warn'); 
            };
            stampImg.src = window.app.companyInfo.stamp;
            stampImg.className = 'company-stamp';
            stampImg.style.position = 'absolute';
            stampImg.style.top = '-15px';
            stampImg.style.right = '-5px';
            
            // 既存の印影を削除
            const oldStamp = companyInfoElement.querySelector('.company-stamp');
            if (oldStamp) oldStamp.remove();
            
            companyInfoElement.appendChild(stampImg);
        }
    } catch (e) {
        window.app.debugLog('PDF画像設定エラー: ' + e.message, 'warn');
        console.warn('PDF画像設定中にエラーが発生しました:', e);
        // 画像がなくても続行できるように例外はスローしない
    }
}

/**
 * 見積書の印刷
 */
function printEstimate() {
    if (!document.getElementById('calculateBtn').dataset.calculated) { 
        alert('先に見積を計算してください。'); 
        return; 
    }
    
    window.ui.switchTab('preview');
    
    setTimeout(() => { 
        window.print(); 
        window.app.debugLog('印刷ダイアログを表示しました', 'info'); 
    }, 300);
}

/**
 * ファイル名用の日付フォーマット
 * @param {Date} date - フォーマットする日付
 * @returns {string} - YYYYMMDD形式の日付文字列
 */
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * PDF関連のイベントリスナー設定
 */
function setupPdfEventListeners() {
    // PDFダウンロードボタン
    document.getElementById('downloadBtn').addEventListener('click', generatePDF);
    document.getElementById('previewDownloadBtn').addEventListener('click', generatePDF);
}

// DOMContentLoaded イベントリスナー
document.addEventListener('DOMContentLoaded', setupPdfEventListeners);

// グローバル関数のエクスポート（他のjsファイルから利用可能に）
window.pdf = {
    generatePDF,
    printEstimate,
    setupPdfImages
};
