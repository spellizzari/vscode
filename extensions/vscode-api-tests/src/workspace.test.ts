/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as assert from 'assert';
import {workspace, TextDocument, window, Position, Uri} from 'vscode';
import {createRandomFile, deleteFile, cleanUp, pathEquals} from './utils';
import {join, basename} from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('workspace-namespace', () => {

	teardown(cleanUp);

	test('textDocuments', () => {
		assert.ok(Array.isArray(workspace.textDocuments));
		assert.throws(() => workspace.textDocuments = null);
	});

	test('rootPath', () => {
		assert.ok(pathEquals(workspace.rootPath, join(__dirname, '../testWorkspace')));
		assert.throws(() => workspace.rootPath = 'farboo');
	});

	test('openTextDocument', () => {
		return workspace.openTextDocument(join(workspace.rootPath, './far.js')).then(doc => {
			assert.ok(doc);
			assert.equal(workspace.textDocuments.length, 1);
		});
	});

	test('openTextDocument, illegal path', done => {
		workspace.openTextDocument('funkydonky.txt').then(doc => {
			done(new Error('missing error'));
		}, err => {
			done();
		});
	});

	test('openTextDocument, untitled is dirty', function(done) {
		if (process.platform === 'win32') {
			return done(); // TODO@Joh this test fails on windows
		}
		
		workspace.openTextDocument(Uri.parse('untitled://' + join(workspace.rootPath, './newfile.txt'))).then(doc => {
			assert.equal(doc.uri.scheme, 'untitled');
			assert.ok(doc.isDirty);
			done();
		});
	});

	// test('openTextDocument, untitled closes on save', function(done) {
	// 	workspace.openTextDocument(Uri.parse('untitled://' + join(workspace.rootPath, './newfile2.txt'))).then(doc => {
	// 		assert.equal(doc.uri.scheme, 'untitled');
	// 		assert.ok(doc.isDirty);

	// 		let closed: TextDocument, opened: TextDocument;
	// 		let d0 = workspace.onDidCloseTextDocument(e => closed = e);
	// 		let d1 = workspace.onDidOpenTextDocument(e => opened = e);

	// 		function donedone() {
	// 			assert.ok(closed === doc);
	// 			assert.equal(opened.uri.scheme, 'file');
	// 			assert.equal(opened.uri.toString(), 'file:///' + join(workspace.rootPath, './newfile2.txt'))
	// 			d0.dispose();
	// 			d1.dispose();

	// 			deleteFile(opened.uri).then(done, done);
	// 		}

	// 		doc.save().then(donedone, done);
	// 	});
	// })

	test('events: onDidOpenTextDocument, onDidChangeTextDocument, onDidSaveTextDocument', () => {
		return createRandomFile().then(file => {
			let disposables = [];

			let onDidOpenTextDocument = false;
			disposables.push(workspace.onDidOpenTextDocument(e => {
				assert.ok(pathEquals(e.uri.fsPath, file.fsPath));
				onDidOpenTextDocument = true;
			}));

			let onDidChangeTextDocument = false;
			disposables.push(workspace.onDidChangeTextDocument(e => {
				assert.ok(pathEquals(e.document.uri.fsPath, file.fsPath));
				onDidChangeTextDocument = true;
			}));

			let onDidSaveTextDocument = false;
			disposables.push(workspace.onDidSaveTextDocument(e => {
				assert.ok(pathEquals(e.uri.fsPath, file.fsPath));
				onDidSaveTextDocument = true;
			}));

			return workspace.openTextDocument(file).then(doc => {
				return window.showTextDocument(doc).then((editor) => {
					return editor.edit((builder) => {
						builder.insert(new Position(0, 0), 'Hello World');
					}).then(applied => {
						return doc.save().then(saved => {
							assert.ok(onDidOpenTextDocument);
							assert.ok(onDidChangeTextDocument);
							assert.ok(onDidSaveTextDocument);

							while (disposables.length) {
								disposables.pop().dispose();
							}

							return deleteFile(file);
						});
					});
				});
			});
		});
	});

	test('findFiles', () => {
		return workspace.findFiles('*.js', null).then((res) => {
			assert.equal(res.length, 1);
			assert.equal(basename(workspace.asRelativePath(res[0])), 'far.js');
		});
	});
});